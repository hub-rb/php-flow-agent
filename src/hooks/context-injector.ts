/**
 * context-injector.ts
 * 上下文注入 Hook - 优先级 30
 * 在会话开始时注入项目配置
 */

import type { HookConfig, HookContext } from '@/types';
import { HOOK_PRIORITIES } from '@/types';
import { logger } from '@/utils/logger';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * 项目配置结构
 */
interface ProjectConfig {
  agentsMd?: string;
  phpVersion?: string;
  phpPath?: string;
  framework?: string;
  projectStructure?: string;
}

/**
 * 解析 composer.json 获取 PHP 版本
 */
async function parseComposerJson(cwd: string): Promise<{ phpVersion?: string } | null> {
  const composerPath = join(cwd, 'composer.json');
  if (!existsSync(composerPath)) {
    return null;
  }

  try {
    const content = await readFile(composerPath, 'utf-8');
    const composer = JSON.parse(content);
    const phpRequire = composer.require?.php;

    if (phpRequire) {
      // 解析 PHP 版本要求，如 ">=8.1" 或 "^8.2"
      const versionMatch = phpRequire.match(/(\d+\.\d+)/);
      return { phpVersion: versionMatch?.[1] };
    }

    return null;
  } catch (error) {
    logger.warn('composer.json 解析失败');
    return null;
  }
}

/**
 * 读取 AGENTS.md
 */
async function readAgentsMd(cwd: string): Promise<string | null> {
  const agentsPath = join(cwd, 'AGENTS.md');
  if (!existsSync(agentsPath)) {
    return null;
  }

  try {
    return await readFile(agentsPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 构建项目上下文
 */
async function buildProjectContext(cwd: string): Promise<ProjectConfig> {
  const config: ProjectConfig = {};

  // 读取 AGENTS.md
  const agentsMd = await readAgentsMd(cwd);
  if (agentsMd) {
    config.agentsMd = agentsMd;

    // 从 AGENTS.md 解析配置
    const phpVersionMatch = agentsMd.match(/php_version:\s*(\d+\.\d+)/i);
    if (phpVersionMatch) {
      config.phpVersion = phpVersionMatch[1];
    }

    const phpPathMatch = agentsMd.match(/php_path:\s*(.+)/i);
    if (phpPathMatch) {
      config.phpPath = phpPathMatch[1].trim();
    }

    const frameworkMatch = agentsMd.match(/framework:\s*(.+)/i);
    if (frameworkMatch) {
      config.framework = frameworkMatch[1].trim();
    }
  }

  // 从 composer.json 解析
  const composerInfo = await parseComposerJson(cwd);
  if (composerInfo?.phpVersion && !config.phpVersion) {
    config.phpVersion = composerInfo.phpVersion;
  }

  return config;
}

/**
 * 格式化注入的上下文
 */
function formatInjectContext(config: ProjectConfig): string {
  const lines: string[] = ['## 项目配置上下文'];

  if (config.phpVersion) {
    lines.push(`- PHP 版本: ${config.phpVersion}`);
  }
  if (config.phpPath) {
    lines.push(`- PHP 路径: ${config.phpPath}`);
  }
  if (config.framework) {
    lines.push(`- 框架: ${config.framework}`);
  }

  if (config.agentsMd) {
    lines.push('\n## AGENTS.md 内容');
    lines.push(config.agentsMd.substring(0, 2000)); // 截断过长的内容
  }

  return lines.join('\n');
}

/**
 * 会话上下文缓存
 */
const sessionContextCache = new Map<string, ProjectConfig>();

/**
 * context-injector Hook 配置
 */
export const contextInjectorHook: HookConfig = {
  name: 'context-injector',
  priority: HOOK_PRIORITIES.CONTEXT_INJECTOR, // 30
  event: 'session.created',

  handler: async (input: unknown, output: unknown) => {
    const hookInput = input as HookContext;
    const { sessionId } = hookInput;
    const cwd = process.cwd();

    // 构建项目上下文
    const config = await buildProjectContext(cwd);

    if (!config.agentsMd && !config.phpVersion) {
      logger.debug('无项目配置需要注入');
      return;
    }

    // 缓存上下文
    sessionContextCache.set(sessionId, config);

    // 注入到会话（通过 output 或其他方式）
    // OpenCode SDK 支持在 session.created 时注入初始上下文
    logger.info(`注入项目上下文到会话 ${sessionId}`);
  },
};

/**
 * 获取会话的项目配置
 */
export function getSessionContext(sessionId: string): ProjectConfig | undefined {
  return sessionContextCache.get(sessionId);
}

/**
 * 清理会话上下文缓存
 */
export function cleanupSessionContext(sessionId: string): void {
  sessionContextCache.delete(sessionId);
}
