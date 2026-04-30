/**
 * php-flow-agent Plugin v2.0
 * 完整实现：Agent 注入 + 调用链追踪 + 上下文注入
 */
import { readFile } from "fs/promises";
import { join } from "path";
import type { UserConfig, AgentRegistry, BuildMaxAgentConfig } from "./types";
import { agents as agentConfigs } from "./agents/index";
import { hookLog } from "./utils/logger";

async function loadJson(filePath: string) {
  try { return JSON.parse(await readFile(filePath, "utf-8")); } catch { return null; }
}

// ============================================================
// 模型继承解析
// ============================================================
/**
 * 模型继承解析
 * 优先级：子agent配置 > 主agent配置(primaryModel) > 全局默认
 */
function resolveModel(userConfig: UserConfig | null, agentName: string) {
  const agentCfg = userConfig?.agents?.[agentName];
  // 1. 子agent有显式配置
  if (agentCfg?.model) return agentCfg.model;
  // 2. 主agent有配置
  if (userConfig?.primaryModel) return userConfig.primaryModel;
  // 3. 全局默认
  return "alibaba-coding-plan-cn/glm-5";
}

// ============================================================
// Plugin 主函数
// ============================================================
export const BuildMaxPlugin = async (ctx: any) => {
  hookLog("PLUGIN", "====== 插件启动 ======", "warn");

  const configPath = join(process.env.USERPROFILE || "~", ".config", "opencode", "php-flow-agent.json");
  const userConfig = (await loadJson(configPath)) || {};

  const agents: Record<string, BuildMaxAgentConfig> = {};
  for (const [name, cfg] of Object.entries(agentConfigs)) {
    const override = userConfig.agents?.[name] || {};
    agents[name] = {
      name: cfg.name,
      description: override.description || cfg.description,
      mode: cfg.mode,
      model: resolveModel(userConfig, name),
      permission: cfg.permission,
      prompt: cfg.prompt || "",
    };
  }
  hookLog("PLUGIN", `${Object.keys(agents).length} agents 已就绪`);

  return {
    config: async (config: AgentRegistry) => {
      config.agent = { ...config.agent, ...agents };
      hookLog("PLUGIN", `agents 已注入: ${Object.keys(config.agent).length} 个`);
    },
  };
};

// 只导出插件函数（其他导出会被 OpenCode 误认为插件）
export { BuildMaxPlugin as server };
