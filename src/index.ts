/**
 * build-max Plugin 主入口
 * 基于 @opencode-ai/plugin SDK 的多 Agent 编排系统
 */

import type { Plugin, Hooks, Config } from '@opencode-ai/plugin';
import type { AgentConfig } from '@opencode-ai/sdk';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Plugin 元信息
const PLUGIN_NAME = '@build-max/plugin';
const PLUGIN_VERSION = '1.0.0';

// Agent 名称列表
const AGENT_NAMES = {
  PRIMARY: 'build-max',
  ANALYZER: 'build-max-analyzer',
  CODER: 'build-max-coder',
  GIT_MANAGER: 'build-max-git-manager',
  IMAGE_READER: 'build-max-image-reader',
  REVIEWER: 'build-max-reviewer',
};

/**
 * 加载 markdown prompt 文件（去除 frontmatter）
 */
async function loadPromptContent(promptDir: string, agentName: string): Promise<string> {
  const filePath = join(promptDir, `${agentName}.md`);
  const raw = await readFile(filePath, 'utf-8');
  
  // 去除 frontmatter（--- 开头和结尾的部分）
  const contentMatch = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  if (contentMatch) {
    return contentMatch[1].trim();
  }
  
  return raw.trim();
}

/**
 * 解析 frontmatter 获取配置
 */
function parseFrontmatter(raw: string): Record<string, unknown> {
  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) return {};
  
  const frontmatterStr = frontmatterMatch[1];
  const config: Record<string, unknown> = {};
  
  // 简单解析（每行 key: value）
  const lines = frontmatterStr.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      
      // 解析布尔值
      if (value === 'true') config[key] = true;
      else if (value === 'false') config[key] = false;
      else if (value === 'allow' || value === 'deny' || value === 'ask') config[key] = value;
      else if (!isNaN(Number(value))) config[key] = Number(value);
      else config[key] = value;
    }
  }
  
  return config;
}

/**
 * build-max Plugin 实现
 */
const BuildMaxPlugin: Plugin = async (ctx) => {
  const { project, directory, worktree } = ctx;

  console.log(`[${PLUGIN_NAME}] Plugin 初始化`);
  console.log(`[${PLUGIN_NAME}] directory: ${directory}`);

  // Prompts 目录（相对于插件安装位置）
  const promptDir = join(directory, 'src', 'agents', 'prompts');

  // 加载所有 agent prompts
  const agentConfigs: Record<string, AgentConfig> = {};

  for (const [key, agentName] of Object.entries(AGENT_NAMES)) {
    try {
      const filePath = join(promptDir, `${agentName}.md`);
      const raw = await readFile(filePath, 'utf-8');
      
      // 解析 frontmatter
      const frontmatter = parseFrontmatter(raw);
      
      // 加载 prompt 内容（去除 frontmatter）
      const promptContent = await loadPromptContent(promptDir, agentName);
      
      // 构建 AgentConfig
      agentConfigs[agentName] = {
        model: frontmatter.model as string | undefined,
        mode: frontmatter.mode as 'primary' | 'subagent' | undefined,
        description: frontmatter.description as string | undefined,
        prompt: promptContent,
        tools: frontmatter.tools as { [key: string]: boolean } | undefined,
        // permission 简化为 SDK 支持的格式
        permission: {
          edit: 'deny',
          bash: 'deny',
        },
      };
      
      console.log(`[${PLUGIN_NAME}] 已加载 agent: ${agentName}`);
    } catch (error) {
      console.warn(`[${PLUGIN_NAME}] 加载 agent ${agentName} 失败:`, error);
    }
  }

  // 构建返回的 Hooks 对象
  const hooksResult: Hooks = {
    // Config hook - 注入 agents
    config: async (config: Config) => {
      // 注入我们的 agents
      config.agent = {
        ...config.agent, // 保留默认 agents
        ...agentConfigs, // 添加我们的 agents
      };

      console.log(`[${PLUGIN_NAME}] 已注入 ${Object.keys(agentConfigs).length} 个 agents`);
    },
  };

  return hooksResult;
};

// 导出 Plugin（格式与 micode 一致）
export { BuildMaxPlugin };
