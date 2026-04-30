/**
 * php-flow-agent Plugin v2.0
 * 完整实现：Agent 注入 + Hook 权限控制 + 调用链追踪 + 上下文注入
 */
import { readFile } from "fs/promises";
import { join } from "path";

const PLUGIN = "php-flow-agent";

async function loadJson(filePath) {
  try { return JSON.parse(await readFile(filePath, "utf-8")); } catch { return null; }
}

// ============================================================
// Agent 权限矩阵
// ============================================================
const PERMISSIONS = {
  "build-max": {
    edit: "deny", write: "deny", bash: "deny", grep: "deny", glob: "deny", skill: "deny",
    task: { allow: ["build-max-analyzer","build-max-coder","build-max-git-manager","build-max-image-reader","build-max-reviewer","explore"] },
  },
  "build-max-analyzer": { edit: "deny", write: "deny", bash: "deny", task: "deny" },
  "build-max-coder": { edit: "allow", write: "allow", bash: "allow", grep: "allow", glob: "allow" },
  "build-max-git-manager": {
    edit: "deny", write: "deny", bash: { allow: ["git"] }, grep: "deny", glob: "deny", task: "deny",
  },
  "build-max-image-reader": { edit: "deny", write: "deny", bash: "deny", grep: "deny", glob: "deny", task: "deny" },
  "build-max-reviewer": { edit: "deny", write: "deny", bash: "deny", grep: "allow", glob: "deny", task: "deny" },
};

// ============================================================
// 调用链存储
// ============================================================
const callTraces = [];
const contextStore = {};

// ============================================================
// Agent 默认配置
// ============================================================
const DEFAULTS = {
  "build-max": {
    description: "主编排代理，负责对话理解、任务编排、进度追踪",
    mode: "primary",
    prompt: `你是主编排代理 build-max。

## 职责
1. 理解用户意图，判断需求复杂度
2. 复杂需求 → 委托 analyzer 分析 → Plan模式 → 按阶段执行
3. 简单需求 → todowrite 任务列表 → 直接 Task(coder)
4. 每阶段完成后 Task(reviewer) 审查
5. 完成后 Task(git-manager) 生成 commit

## 权限限制（严格遵守）
- ❌ 禁止 edit/write（除了 docs/opencode/plan/**）
- ❌ 禁止 bash/grep/glob/skill
- ✅ 只能 Task 调用: analyzer/coder/git-manager/image-reader/reviewer/explore`,
  },
  "build-max-analyzer": {
    description: "分析需求，输出任务清单（带依赖关系），可调用brainstorming",
    model: "alibaba-coding-plan-cn/glm-5",
    prompt: "你是需求分析专家。分析需求复杂度，输出结构化任务清单（带依赖关系）。⚠️ 禁止 edit/write/bash/Task。",
  },
  "build-max-coder": {
    description: "执行编码任务，遵循红线规则",
    model: "alibaba-coding-plan-cn/qwen3.6-plus",
    prompt: "你是编码执行专家。修改前先read相关文件，不假设不存在的类/方法/API，只改目标代码不顺手格式化无关代码。",
  },
  "build-max-git-manager": {
    description: "Git操作管理，生成规范化commit文案",
    model: "minimax-cn-coding-plan/MiniMax-M2.7",
    prompt: "你是Git管理专家。⚠️ 只能执行 git 命令，禁止其他 bash、grep、glob、Task。只read指定文件。",
  },
  "build-max-image-reader": {
    description: "分析图片/UI截图/设计稿",
    model: "alibaba-coding-plan-cn/qwen3.6-plus",
    prompt: "你是图片分析专家。⚠️ 禁止 edit/write/bash。",
  },
  "build-max-reviewer": {
    description: "代码审查代理，检查完成度、质量、安全、性能",
    model: "alibaba-coding-plan-cn/glm-5",
    prompt: "你是代码审查专家。只检查不修改。⚠️ 禁止 edit/write/bash/Task。有 grep 权限用于检查调用关系。",
  },
};

// ============================================================
// Hook: 权限强制
// ============================================================
function tryGetAgent(input) {
  if (!input) return "unknown";
  if (input.agentInfo?.name) return input.agentInfo.name;
  if (input.agent?.name) return input.agent.name;
  if (typeof input.agent === "string") return input.agent;
  return "unknown";
}

function tryGetSessionID(input) {
  if (input.sessionID) return input.sessionID;
  if (input.session?.id) return input.session.id;
  return "unknown";
}

function tryGetToolArgs(input, output) {
  return output?.args || input?.args || input?.toolArgs || {};
}

function createPermissionEnforcer() {
  return async function onToolBefore(input, output) {
    const tool = input.tool;
    const agentName = tryGetAgent(input);
    const perm = PERMISSIONS[agentName];
    if (!perm) return;

    const args = tryGetToolArgs(input, output);

    // edit/write 检查
    if ((tool === "edit" || tool === "write") && perm[tool] === "deny") {
      console.log(`\x1b[31m[${PLUGIN}][HOOK] ❌ ${agentName} → ${tool}\x1b[0m`);
      throw new Error(`[权限拦截] ${agentName} 不允许 ${tool}`);
    }

    // bash 检查（含命令白名单）
    if (tool === "bash") {
      if (perm.bash === "deny") {
        console.log(`\x1b[31m[${PLUGIN}][HOOK] ❌ ${agentName} → bash\x1b[0m`);
        throw new Error(`[权限拦截] ${agentName} 不允许 bash`);
      }
      if (perm.bash && typeof perm.bash === "object" && perm.bash.allow) {
        const cmd = args.command || "";
        const firstWord = cmd.trim().split(/\s+/)[0];
        if (!perm.bash.allow.includes(firstWord)) {
          console.log(`\x1b[31m[${PLUGIN}][HOOK] ❌ ${agentName} → bash ${firstWord}\x1b[0m`);
          throw new Error(`[权限拦截] ${agentName} bash 仅允许: ${perm.bash.allow.join(", ")}`);
        }
        console.log(`\x1b[32m[${PLUGIN}][HOOK] ✅ ${agentName} → bash ${firstWord}\x1b[0m`);
      }
    }

    // grep/glob 检查
    if ((tool === "grep" || tool === "glob") && perm[tool] === "deny") {
      console.log(`\x1b[31m[${PLUGIN}][HOOK] ❌ ${agentName} → ${tool}\x1b[0m`);
      throw new Error(`[权限拦截] ${agentName} 不允许 ${tool}`);
    }

    // Task 白名单检查
    if (tool === "task") {
      const taskPerm = perm.task;
      if (taskPerm === "deny") {
        console.log(`\x1b[31m[${PLUGIN}][HOOK] ❌ ${agentName} → task\x1b[0m`);
        throw new Error(`[权限拦截] ${agentName} 不允许 Task`);
      }
      if (taskPerm && taskPerm.allow) {
        const target = args.subagent_type || args.type || "";
        if (target && !taskPerm.allow.includes(target)) {
          console.log(`\x1b[31m[${PLUGIN}][HOOK] ❌ ${agentName} → task(${target})\x1b[0m`);
          throw new Error(`[权限拦截] ${agentName} Task 白名单: ${taskPerm.allow.join(", ")}`);
        }
        console.log(`\x1b[32m[${PLUGIN}][HOOK] ✅ ${agentName} → task(${target})\x1b[0m`);
      }
    }
  };
}

// ============================================================
// Hook: 调用链追踪
// ============================================================
function createCallTracer() {
  return async function onToolAfter(input, output) {
    const tool = input.tool;
    if (tool !== "task") return;
    const agentName = tryGetAgent(input);
    const args = tryGetToolArgs(input, output);
    const target = args.subagent_type || args.type || "unknown";
    const trace = { time: new Date().toISOString(), from: agentName, to: target };
    callTraces.push(trace);
    console.log(`\x1b[36m[${PLUGIN}][TRACE] #${callTraces.length} ${agentName} → ${target}\x1b[0m`);
  };
}

// ============================================================
// Hook: 上下文注入
// ============================================================
function createContextInjector() {
  return async function onSessionCreated(input, output) {
    const sid = tryGetSessionID(input);
    if (sid && sid !== "unknown") {
      contextStore[sid] = { createdAt: new Date().toISOString(), traces: 0 };
    }
  };
}

// ============================================================
// Plugin 主函数
// ============================================================
export const BuildMaxPlugin = async (ctx) => {
  console.log(`\x1b[33m[${PLUGIN}] ====== 插件启动 v2.0 ======\x1b[0m`);

  const configPath = join(process.env.USERPROFILE || "~", ".config", "opencode", "php-flow-agent.json");
  const userConfig = (await loadJson(configPath)) || {};

  // 合并 agent 配置
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

  console.log(`[${PLUGIN}] ${Object.keys(agents).length} agents + ${Object.keys(PERMISSIONS).length} 权限规则已就绪`);

  return {
    config: async (config) => {
      config.agent = { ...config.agent, ...agents };
      console.log(`[${PLUGIN}] agents 已注入: ${Object.keys(config.agent).length} 个`);
    },
    "tool.execute.before": createPermissionEnforcer(),
    "tool.execute.after": createCallTracer(),
    "session.created": createContextInjector(),
  };
};

// 查询接口
export function getCallTraces() { return [...callTraces]; }
export function clearCallTraces() { callTraces.length = 0; }

export { BuildMaxPlugin as server };
