import type { Plugin, Config } from "@opencode-ai/plugin";

export const BuildMaxPlugin: Plugin = async (ctx) => {
  console.log("[php-flow-agent] INIT", { dir: ctx.directory });

  return {
    config: async (config: Config) => {
      console.log("[php-flow-agent] CONFIG HOOK 被调用", {
        existingAgents: Object.keys(config.agent || {}),
      });

      config.agent = {
        ...config.agent,
        "test-agent": {
          description: "测试代理",
          mode: "subagent",
          prompt: "你是一个测试代理。",
        },
        "build-max": {
          description: "主编排代理，负责任务编排",
          mode: "primary",
          prompt: "你是主编排代理。",
        },
      };

      console.log("[php-flow-agent] CONFIG HOOK 完成", {
        agents: Object.keys(config.agent),
      });
    },
  };
};

export { BuildMaxPlugin as server };
