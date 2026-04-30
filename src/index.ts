import type { Plugin } from "@opencode-ai/plugin";

export const BuildMaxPlugin: Plugin = async (ctx) => {
  return {
    config: async (config) => {
      // 与 micode 完全一致的方式注入 agents
      config.agent = {
        ...config.agent,
        build: { ...config.agent?.build, mode: "subagent" },
        plan: { ...config.agent?.plan, mode: "subagent" },
        "build-max": {
          description: "主编排代理，负责对话理解、任务编排、进度追踪",
          mode: "primary",
          prompt: "你是主编排代理，负责理解用户意图、判断复杂度、编排任务、追踪进度。",
        },
        "build-max-analyzer": {
          description: "分析需求，输出任务清单（带依赖关系），可调用brainstorming",
          mode: "subagent",
          model: "alibaba-coding-plan-cn/glm-5",
          prompt: "你是需求分析专家，负责分析需求复杂度并输出结构化任务清单。",
        },
        "build-max-coder": {
          description: "执行编码任务，遵循红线规则",
          mode: "subagent",
          model: "alibaba-coding-plan-cn/qwen3.6-plus",
          prompt: "你是编码执行专家，按计划实现代码，修改前先read，不假设不存在的类/方法。",
        },
        "build-max-git-manager": {
          description: "Git操作管理，生成规范化commit文案",
          mode: "subagent",
          model: "minimax-cn-coding-plan/MiniMax-M2.7",
          prompt: "你是Git管理专家，负责分支管理和commit文案生成。只能执行git相关命令。",
        },
        "build-max-image-reader": {
          description: "分析图片/UI截图/设计稿，返回结构化描述",
          mode: "subagent",
          model: "alibaba-coding-plan-cn/qwen3.6-plus",
          prompt: "你是图片分析专家，解读图片内容并返回结构化描述。",
        },
        "build-max-reviewer": {
          description: "代码审查代理，检查完成度、代码质量、安全性能",
          mode: "subagent",
          model: "alibaba-coding-plan-cn/glm-5",
          prompt: "你是代码审查专家，只检查不修改。检查需求完成度、代码质量、安全性、性能。",
        },
      };
    },
  };
};
