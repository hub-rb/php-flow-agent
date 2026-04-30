/**
 * php-flow-agent Plugin
 * - 配置文件: ~/.config/opencode/php-flow-agent.json
 * - prompt 内容直接嵌入，不依赖文件读取
 */
import { readFile } from "fs/promises";
import { join } from "path";

const PLUGIN = "php-flow-agent";

async function loadJson(filePath) {
  try { return JSON.parse(await readFile(filePath, "utf-8")); } catch { return null; }
}

// 默认 agent 配置（prompt 内容嵌入，避免文件读取失败）
const DEFAULTS = {
  "build-max": {
    description: "主编排代理，负责对话理解、任务编排、进度追踪",
    mode: "primary",
    prompt: `你是主编排代理，负责理解用户意图、判断复杂度、编排任务、追踪进度。`,
  },
  "build-max-analyzer": {
    description: "分析需求，输出任务清单（带依赖关系）",
    model: "alibaba-coding-plan-cn/glm-5",
    prompt: `你是需求分析专家。分析需求复杂度，输出结构化任务清单（带依赖关系）。`,
  },
  "build-max-coder": {
    description: "执行编码任务，遵循红线规则",
    model: "alibaba-coding-plan-cn/qwen3.6-plus",
    prompt: `你是编码执行专家。修改前先read相关文件，不假设不存在的类/方法/API，只改目标代码不顺手格式化无关代码。`,
  },
  "build-max-git-manager": {
    description: "Git操作管理，生成规范化commit文案",
    model: "minimax-cn-coding-plan/MiniMax-M2.7",
    prompt: `你是Git管理专家。只执行git相关命令，生成规范化commit文案。`,
  },
  "build-max-image-reader": {
    description: "分析图片/UI截图/设计稿",
    model: "alibaba-coding-plan-cn/qwen3.6-plus",
    prompt: `你是图片分析专家。解读图片内容并返回结构化描述。`,
  },
  "build-max-reviewer": {
    description: "代码审查代理，检查完成度、质量、安全、性能",
    model: "alibaba-coding-plan-cn/glm-5",
    prompt: `你是代码审查专家。只检查不修改，检查需求完成度、代码质量、安全性、性能。`,
  },
};

export const BuildMaxPlugin = async (ctx) => {
  console.log(`[${PLUGIN}] STEP1 init, dir=`, ctx.directory);

  try {
    const configPath = join(process.env.USERPROFILE || "~", ".config", "opencode", "php-flow-agent.json");
    const userConfig = (await loadJson(configPath)) || {};
    console.log(`[${PLUGIN}] STEP2 配置加载:`, userConfig.agents ? Object.keys(userConfig.agents) : "(默认)");

    // 合并默认配置和用户配置
    const agents = {};
    for (const [name, def] of Object.entries(DEFAULTS)) {
      const override = userConfig.agents?.[name] || {};
      agents[name] = {
        description: override.description || def.description,
        mode: def.mode || "subagent",
        model: override.model || def.model,
        prompt: override.prompt || def.prompt,
      };
    }
    console.log(`[${PLUGIN}] STEP3 agents 就绪:`, Object.keys(agents));

    return {
      config: async (config) => {
        console.log(`[${PLUGIN}] STEP4 config hook, 现有:`, Object.keys(config.agent || {}));

        config.agent = {
          ...config.agent,
          ...agents,
        };
        console.log(`[${PLUGIN}] STEP5 完成:`, Object.keys(config.agent));
      },
    };
  } catch (e) {
    console.error(`[${PLUGIN}] FATAL:`, e.message, e.stack);
    return {};
  }
};

export { BuildMaxPlugin as server };
