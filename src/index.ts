/**
 * php-flow-agent Plugin
 * 完全模仿 OpenCode 生态插件方式，纯 JS 对象注入 agents
 */

// 不使用任何 import type，避免模块解析失败
// @opencode-ai/plugin 作为 peerDependency，由 OpenCode 环境提供

const PLUGIN = "php-flow-agent";

export const BuildMaxPlugin = async (ctx) => {
  console.log(`[${PLUGIN}] STEP1: 插件函数被调用`);
  console.log(`[${PLUGIN}] ctx.directory:`, ctx.directory);

  try {
    const hooks = {
      config: async (config) => {
        try {
          console.log(`[${PLUGIN}] STEP2: config hook 被调用`);
          console.log(`[${PLUGIN}] 现有 agents:`, Object.keys(config.agent || {}));

          config.agent = Object.assign({}, config.agent, {
            // demote built-in agents to subagent（与 micode 一致）
            build: Object.assign({}, config.agent?.build, { mode: "subagent" }),
            plan: Object.assign({}, config.agent?.plan, { mode: "subagent" }),

            // 我们的 agents
            "build-max": {
              description: "主编排代理，负责对话理解、任务编排、进度追踪",
              mode: "primary",
              prompt: "你是主编排代理。负责理解用户意图、判断复杂度、编排任务、追踪进度。",
            },
            "build-max-analyzer": {
              description: "分析需求，输出任务清单（带依赖关系）",
              mode: "subagent",
              model: "alibaba-coding-plan-cn/glm-5",
              prompt: "你是需求分析专家。分析需求复杂度，输出结构化任务清单。",
            },
            "build-max-coder": {
              description: "执行编码任务，遵循红线规则",
              mode: "subagent",
              model: "alibaba-coding-plan-cn/qwen3.6-plus",
              prompt: "你是编码执行专家。修改前先read，不假设不存在的类/方法，只改目标代码。",
            },
            "build-max-git-manager": {
              description: "Git操作管理，生成规范化commit文案",
              mode: "subagent",
              model: "minimax-cn-coding-plan/MiniMax-M2.7",
              prompt: "你是Git管理专家。只执行git命令，生成规范化commit文案。",
            },
            "build-max-image-reader": {
              description: "分析图片/UI截图/设计稿",
              mode: "subagent",
              model: "alibaba-coding-plan-cn/qwen3.6-plus",
              prompt: "你是图片分析专家。解读图片内容并返回结构化描述。",
            },
            "build-max-reviewer": {
              description: "代码审查代理，检查完成度、质量、安全、性能",
              mode: "subagent",
              model: "alibaba-coding-plan-cn/glm-5",
              prompt: "你是代码审查专家。只检查不修改，检查需求完成度、代码质量、安全性、性能。",
            },
          });

          console.log(`[${PLUGIN}] STEP3: config 完成，agents:`, Object.keys(config.agent));
        } catch (e) {
          console.error(`[${PLUGIN}] config hook 内部错误:`, e);
          throw e;
        }
      },
    };

    console.log(`[${PLUGIN}] STEP4: 返回 hooks`);
    return hooks;
  } catch (e) {
    console.error(`[${PLUGIN}] 插件函数错误:`, e);
    return {};
  }
};

// 同时导出 server 和命名导出，兼容两种加载模式
export { BuildMaxPlugin as server };
