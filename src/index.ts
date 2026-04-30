/**
 * php-flow-agent Plugin
 * 基于 OpenCode 生态插件方式
 * - 使用 config hook 注入 agents
 * - 从 markdown prompt 文件读取配置
 */
import { readFile } from "fs/promises";
import { join } from "path";

const PLUGIN = "php-flow-agent";

/**
 * 解析 markdown frontmatter
 */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { config: {}, content: raw };

  const frontmatter = match[1];
  const content = match[2].trim();
  const config = {};

  for (const line of frontmatter.split("\n")) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) {
      const key = m[1], val = m[2].trim();
      if (val === "true") config[key] = true;
      else if (val === "false") config[key] = false;
      else config[key] = val;
    }
  }

  return { config, content };
}

/**
 * 加载 agent 的 markdown prompt 并解析配置
 */
async function loadAgent(promptDir, agentName) {
  const filePath = join(promptDir, `${agentName}.md`);
  const raw = await readFile(filePath, "utf-8");
  const { config, content } = parseFrontmatter(raw);

  return {
    description: config.description || "",
    mode: config.mode || "subagent",
    model: config.model || undefined,
    tools: config.tools || undefined,
    prompt: content,
  };
}

export const BuildMaxPlugin = async (ctx) => {
  console.log(`[${PLUGIN}] STEP1: 插件初始化, dir=${ctx.directory}`);

  // prompts 目录：相对于插件源码目录
  const promptDir = join(ctx.directory, "src", "agents", "prompts");

  try {
    // 从 markdown 加载 agent 配置（模型可配置化）
    const buildMax = await loadAgent(promptDir, "build-max");
    const analyzer = await loadAgent(promptDir, "build-max-analyzer");
    const coder = await loadAgent(promptDir, "build-max-coder");
    const gitManager = await loadAgent(promptDir, "build-max-git-manager");
    const imageReader = await loadAgent(promptDir, "build-max-image-reader");
    const reviewer = await loadAgent(promptDir, "build-max-reviewer");

    console.log(`[${PLUGIN}] STEP2: 已加载 6 个 agent 配置`);

    return {
      config: async (config) => {
        console.log(`[${PLUGIN}] STEP3: config hook 触发`);
        console.log(`[${PLUGIN}] 现有 agents:`, Object.keys(config.agent || {}));

        // 与 micode 完全一致的方式 —— spread 合并
        config.agent = {
          ...config.agent,
          // 显式保留 plan/build
          build: config.agent?.build,
          plan: config.agent?.plan,
          "build-max": { ...buildMax, mode: "primary" },
          "build-max-analyzer": analyzer,
          "build-max-coder": coder,
          "build-max-git-manager": gitManager,
          "build-max-image-reader": imageReader,
          "build-max-reviewer": reviewer,
        };

        console.log(`[${PLUGIN}] STEP4: config 完成, agents:`, Object.keys(config.agent));
      },
    };
  } catch (e) {
    console.error(`[${PLUGIN}] 错误:`, e);
    return {};
  }
};

export { BuildMaxPlugin as server };
