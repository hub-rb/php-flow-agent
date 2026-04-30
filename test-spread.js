// 测试脚本：模拟 OpenCode config hook 执行
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

const DEFAULTS = {
  "build-max":          { desc: "主代理", mode: "primary" },
  "build-max-analyzer": { desc: "分析", model: "alibaba-coding-plan-cn/glm-5" },
};

async function main() {
  const ctx = { directory: process.cwd() };
  const promptDir = join(ctx.directory, "src", "agents", "prompts");
  const configPath = join(process.env.USERPROFILE || "~", ".config", "opencode", "php-flow-agent.json");

  const userConfig = (await loadJson(configPath)) || {};
  
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

  // 模拟 OpenCode 传入的 config.agent 对象（包含 plan 和 build）
  const config = {
    agent: {
      plan: { description: "Planning agent", mode: "primary", prompt: "plan..." },
      build: { description: "Build agent", mode: "primary", prompt: "build..." },
      explore: { description: "Explorer", mode: "subagent", model: "test/test" },
    }
  };

  console.log("=== BEFORE ===");
  console.log("agents:", JSON.stringify(Object.keys(config.agent)));

  // 方式1: 简单展开（之前工作的版本）
  const test1 = { ...config.agent, ...agents };
  console.log("\n=== 方式1: { ...config.agent, ...agents } ===");
  console.log("agents:", JSON.stringify(Object.keys(test1)));
  console.log("plan:", JSON.stringify(test1.plan?.description));
  console.log("build:", JSON.stringify(test1.build?.description));

  // 方式2: JSON 深拷贝
  const build = config.agent?.build ? JSON.parse(JSON.stringify(config.agent.build)) : undefined;
  const plan = config.agent?.plan ? JSON.parse(JSON.stringify(config.agent.plan)) : undefined;
  const test2 = { ...config.agent, ...(build ? { build } : {}), ...(plan ? { plan } : {}), ...agents };
  console.log("\n=== 方式2: 深拷贝 spread ===");
  console.log("agents:", JSON.stringify(Object.keys(test2)));
  console.log("plan:", JSON.stringify(test2.plan?.description));
  console.log("build:", JSON.stringify(test2.build?.description));
}

main();
