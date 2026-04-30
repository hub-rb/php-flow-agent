/**
 * Hook 功能验证测试
 * 模拟 OpenCode 调用流程，验证权限拦截和调用链追踪
 */
import { BuildMaxPlugin, getCallTraces, clearCallTraces } from "./src/index.ts";

const ctx = { directory: process.cwd(), project: { id: "test" }, worktree: process.cwd() };

let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch(e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

async function main() {
  console.log("\n========================================");
  console.log("  Hook 功能验证测试");
  console.log("========================================");

  // 1. 插件初始化
  console.log("\n📦 1. 插件初始化");
  const hooks = await BuildMaxPlugin(ctx);
  check("返回 config hook", () => { if (!hooks.config) throw Error("缺少 config") });
  check("返回 tool.execute.before", () => { if (!hooks["tool.execute.before"]) throw Error("缺少 before hook") });
  check("返回 tool.execute.after", () => { if (!hooks["tool.execute.after"]) throw Error("缺少 after hook") });
  check("返回 session.created", () => { if (!hooks["session.created"]) throw Error("缺少 session hook") });

  // 2. Agent 注入测试
  console.log("\n📦 2. Agent 注入");
  const config = { agent: { plan: { mode: "primary" }, build: { mode: "primary" } } };
  await hooks.config(config);
  check("build-max 已注入", () => { if (!config.agent["build-max"]) throw Error("缺失") });
  check("plan 保留", () => { if (!config.agent.plan) throw Error("丢失") });
  check("build 保留", () => { if (!config.agent.build) throw Error("丢失") });
  check("6个自定义agent", () => {
    const names = Object.keys(config.agent).filter(k => k.startsWith("build-max"));
    if (names.length !== 6) throw Error(`期望6个，实际${names.length}`);
  });

  // 3. 权限 Hook 测试 —— 边界情况
  console.log("\n📦 3. 权限强制 Hook");

  const beforeHook = hooks["tool.execute.before"];

  // 3.1 build-max 禁止 edit
  console.log("\n  3.1 build-max 权限限制");
  await beforeHook(
    { tool: "edit", agent: { name: "build-max" } },
    { args: { filePath: "src/test.ts" } }
  ).then(
    () => { console.log("  ❌ build-max edit 应被拦截但通过了"); failed++; },
    (e) => { console.log(`  ✅ build-max edit 已拦截: ${e.message}`); passed++; }
  );

  // 3.2 build-max 禁止 bash
  await beforeHook(
    { tool: "bash", agent: { name: "build-max" } },
    { args: { command: "rm -rf /" } }
  ).then(
    () => { console.log("  ❌ build-max bash 应被拦截"); failed++; },
    (e) => { console.log(`  ✅ build-max bash 已拦截: ${e.message}`); passed++; }
  );

  // 3.3 build-max 禁止 grep
  await beforeHook(
    { tool: "grep", agent: { name: "build-max" } },
    { args: {} }
  ).then(
    () => { console.log("  ❌ build-max grep 应被拦截"); failed++; },
    (e) => { console.log(`  ✅ build-max grep 已拦截: ${e.message}`); passed++; }
  );

  // 3.4 coder 允许 edit
  console.log("\n  3.2 coder 权限允许");
  await beforeHook(
    { tool: "edit", agent: { name: "build-max-coder" } },
    { args: { filePath: "src/test.ts" } }
  ).then(
    () => { console.log("  ✅ coder edit 通过"); passed++; },
    (e) => { console.log(`  ❌ coder edit 被拦截: ${e.message}`); failed++; }
  );

  // 3.5 git-manager 只能 git 命令
  console.log("\n  3.3 git-manager bash 白名单");
  await beforeHook(
    { tool: "bash", agent: { name: "build-max-git-manager" } },
    { args: { command: "git status" } }
  ).then(
    () => { console.log("  ✅ git status 通过"); passed++; },
    (e) => { console.log(`  ❌ git status 被拦截: ${e.message}`); failed++; }
  );

  await beforeHook(
    { tool: "bash", agent: { name: "build-max-git-manager" } },
    { args: { command: "npm install" } }
  ).then(
    () => { console.log("  ❌ npm install 应被拦截"); failed++; },
    (e) => { console.log(`  ✅ npm install 已拦截: ${e.message}`); passed++; }
  );

  // 3.6 analyzer 禁止 edit/bash/Task
  console.log("\n  3.4 analyzer 权限限制");
  await beforeHook(
    { tool: "edit", agent: { name: "build-max-analyzer" } },
    { args: {} }
  ).then(
    () => { console.log("  ❌ analyzer edit 应被拦截"); failed++; },
    (e) => { console.log(`  ✅ analyzer edit 已拦截`); passed++; }
  );

  await beforeHook(
    { tool: "task", agent: { name: "build-max-analyzer" } },
    { args: { subagent_type: "build-max-coder" } }
  ).then(
    () => { console.log("  ❌ analyzer Task 应被拦截"); failed++; },
    (e) => { console.log(`  ✅ analyzer Task 已拦截`); passed++; }
  );

  // 3.7 reviewer 有 grep 权限但禁止 edit/bash
  console.log("\n  3.5 reviewer 权限混合");
  await beforeHook(
    { tool: "edit", agent: { name: "build-max-reviewer" } },
    { args: { filePath: "src/test.ts" } }
  ).then(
    () => { console.log("  ❌ reviewer edit 应被拦截"); failed++; },
    (e) => { console.log(`  ✅ reviewer edit 已拦截`); passed++; }
  );

  await beforeHook(
    { tool: "grep", agent: { name: "build-max-reviewer" } },
    { args: {} }
  ).then(
    () => { console.log("  ✅ reviewer grep 通过"); passed++; },
    (e) => { console.log(`  ❌ reviewer grep 被拦截`); failed++; }
  );

  // 3.8 build-max Task 白名单
  console.log("\n  3.6 build-max Task 白名单");
  await beforeHook(
    { tool: "task", agent: { name: "build-max" } },
    { args: { subagent_type: "build-max-coder" } }
  ).then(
    () => { console.log("  ✅ Task(coder) 通过"); passed++; },
    (e) => { console.log(`  ❌ Task(coder) 被拦截`); failed++; }
  );

  await beforeHook(
    { tool: "task", agent: { name: "build-max" } },
    { args: { subagent_type: "unknown-agent" } }
  ).then(
    () => { console.log("  ❌ Task(unknown) 应被拦截"); failed++; },
    (e) => { console.log(`  ✅ Task(unknown) 已拦截`); passed++; }
  );

  // 4. 调用链追踪
  console.log("\n📦 4. 调用链追踪");
  clearCallTraces();
  const afterHook = hooks["tool.execute.after"];

  await afterHook(
    { tool: "task", sessionID: "test-session", agent: { name: "build-max" } },
    { args: { subagent_type: "build-max-analyzer" } }
  );
  await afterHook(
    { tool: "task", sessionID: "test-session", agent: { name: "build-max" } },
    { args: { subagent_type: "build-max-coder" } }
  );
  await afterHook(
    { tool: "read", sessionID: "test-session", agent: { name: "build-max" } },
    {}
  ); // 非 Task 工具不追踪

  const traces = getCallTraces();
  check("追踪了 2 次 Task", () => { if (traces.length !== 2) throw Error(`期望2, 实际${traces.length}`) });
  check("第1次: build-max → analyzer", () => { if (traces[0].to !== "build-max-analyzer") throw Error(traces[0].to) });
  check("第2次: build-max → coder", () => { if (traces[1].to !== "build-max-coder") throw Error(traces[1].to) });

  // ============================================================
  // 结果
  // ============================================================
  console.log("\n========================================");
  console.log(`  结果: ${passed} 通过, ${failed} 失败`);
  console.log("========================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

main();
