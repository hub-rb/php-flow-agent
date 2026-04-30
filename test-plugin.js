// 模拟 OpenCode 调用插件
import { BuildMaxPlugin } from "./src/index.ts";

// 模拟的 ctx（OpenCode 传给插件的上下文）
const ctx = {
  directory: process.cwd(),
  project: { id: "test", name: "test" },
  worktree: process.cwd(),
};

// 模拟 OpenCode 的 config 对象
const config = {
  agent: {
    plan: { description: "Plan agent", mode: "primary" },
    build: { description: "Build agent", mode: "primary" },
  }
};

async function main() {
  console.log("=== 调用 BuildMaxPlugin ===");
  const hooks = await BuildMaxPlugin(ctx);
  
  console.log("\n返回 hooks:", Object.keys(hooks));
  
  if (hooks.config) {
    console.log("\n=== 调用 config hook ===");
    console.log("调用前 config.agent keys:", Object.keys(config.agent));
    
    await hooks.config(config);
    
    console.log("调用后 config.agent keys:", Object.keys(config.agent));
    console.log("plan:", !!config.agent.plan);
    console.log("build:", !!config.agent.build);
    console.log("build-max:", !!config.agent["build-max"]);
    console.log("build-max-coder:", !!config.agent["build-max-coder"]);
    
    // 验证结果
    const hasPlan = !!config.agent.plan;
    const hasBuild = !!config.agent.build;
    const hasBuildMax = !!config.agent["build-max"];
    const hasCoder = !!config.agent["build-max-coder"];
    
    console.log("\n=== 验证结果 ===");
    console.log(`plan 保留: ${hasPlan ? "✅" : "❌"}`);
    console.log(`build 保留: ${hasBuild ? "✅" : "❌"}`);
    console.log(`build-max: ${hasBuildMax ? "✅" : "❌"}`);
    console.log(`build-max-coder: ${hasCoder ? "✅" : "❌"}`);
    
    if (!hasPlan || !hasBuild) process.exit(1);
    if (!hasBuildMax || !hasCoder) process.exit(1);
  } else {
    console.log("❌ 没有 config hook!");
    process.exit(1);
  }
}

main();
