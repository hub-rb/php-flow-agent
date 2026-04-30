/**
 * php-flow-agent Plugin
 * 提供 Agent 权限控制和调用链追踪
 * Agent 注册通过 ~/.config/opencode/agents/*.md 实现
 */
import type { Plugin } from "@opencode-ai/plugin";

export const BuildMaxPlugin: Plugin = async (ctx) => {
  console.log("[php-flow-agent] 插件已加载");

  return {
    "tool.execute.before": async (input, output) => {
      // 权限验证 hook
      if (input.tool === "edit" || input.tool === "write") {
        // 可在此处添加自定义权限逻辑
      }
    },
    "tool.execute.after": async (input, output) => {
      // 调用链追踪
    },
  };
};

export { BuildMaxPlugin as server };
