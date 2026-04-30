/**
 * php-flow-agent Plugin
 * 配置文件: ~/.config/opencode/php-flow-agent.json
 */
import { readFile } from "fs/promises";
import { join } from "path";

const PLUGIN = "php-flow-agent";

async function loadJson(filePath) {
  try { return JSON.parse(await readFile(filePath, "utf-8")); } catch { return null; }
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { cfg: {}, content: raw };
  const cfg = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      const v = kv[2].trim();
      cfg[kv[1]] = v === "true" ? true : v === "false" ? false : isNaN(+v) ? v : +v;
    }
  }
  return { cfg, content: m[2].trim() };
}

async function loadAgent(promptDir, name) {
  const { cfg, content } = parseFrontmatter(await readFile(join(promptDir, `${name}.md`), "utf-8"));
  return { description: cfg.description || "", mode: cfg.mode || "subagent", model: cfg.model, tools: cfg.tools, prompt: content };
}

// 默认 agent 定义（配置文件中可覆盖 model/description）
const DEFAULTS = {
  "build-max":          { desc: "主编排代理，负责对话理解、任务编排、进度追踪", mode: "primary" },
  "build-max-analyzer": { desc: "分析需求，输出任务清单（带依赖关系）", model: "alibaba-coding-plan-cn/glm-5" },
  "build-max-coder":    { desc: "执行编码任务，遵循红线规则", model: "alibaba-coding-plan-cn/qwen3.6-plus" },
  "build-max-git-manager": { desc: "Git操作管理，生成规范化commit文案", model: "minimax-cn-coding-plan/MiniMax-M2.7" },
  "build-max-image-reader": { desc: "分析图片/UI截图/设计稿", model: "alibaba-coding-plan-cn/qwen3.6-plus" },
  "build-max-reviewer": { desc: "代码审查代理，检查完成度、质量、安全、性能", model: "alibaba-coding-plan-cn/glm-5" },
};

export const BuildMaxPlugin = async (ctx) => {
  console.log(`[${PLUGIN}] 初始化为`, ctx.directory);

  try {
    const promptDir = join(ctx.directory, "src", "agents", "prompts");
    const configPath = join(process.env.USERPROFILE || "~", ".config", "opencode", "php-flow-agent.json");

    // 加载用户配置
    const userConfig = (await loadJson(configPath)) || {};
    console.log(`[${PLUGIN}] 加载配置:`, userConfig.agents ? Object.keys(userConfig.agents) : "(无自定义)");

    // 加载 agent prompts + 合并用户自定义配置
    const agents = {};
    for (const [name, def] of Object.entries(DEFAULTS)) {
      const prompt = await loadAgent(promptDir, name);
      const override = userConfig.agents?.[name] || {};
      agents[name] = {
        description: override.description || def.desc,
        mode: def.mode || "subagent",
        model: override.model || def.model || prompt.model,
        prompt: prompt.prompt,
        tools: prompt.tools,
      };
    }

    return {
      config: async (config) => {
        // 深拷贝保留 plan/build 避免丢失引用特性
        const build = config.agent?.build ? JSON.parse(JSON.stringify(config.agent.build)) : undefined;
        const plan = config.agent?.plan ? JSON.parse(JSON.stringify(config.agent.plan)) : undefined;

        config.agent = {
          ...config.agent,
          ...(build ? { build } : {}),
          ...(plan ? { plan } : {}),
          ...agents,
        };
        console.log(`[${PLUGIN}] 已注入 agents:`, Object.keys(config.agent));
      },
    };
  } catch (e) {
    console.error(`[${PLUGIN}] 错误:`, e);
    return {};
  }
};

export { BuildMaxPlugin as server };
