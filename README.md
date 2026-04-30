# php-flow-agent

OpenCode 多 Agent 编排插件，基于 @opencode-ai/plugin SDK 开发。

## 特性

- **多 Agent 编排**：leader 协调 analyzer、coder、reviewer、git-manager、image-reader 等子 agent 执行复杂任务
- **权限矩阵控制**：每个 agent 有独立的 permission 配置，精确控制工具访问边界
- **强制流程化**：所有需求统一走 Task(analyzer) → PLAN.md → 按阶段并发/顺序执行
- **进度追踪与恢复**：通过 PLAN.md 追踪任务状态，支持中断恢复

## Agent 系统

### 调用关系

```
leader (主编排代理)
├── Task → analyzer (需求分析、输出任务清单)
├── Task → coder (编码实现)
├── Task → git-manager (Git 管理、生成 commit 文案)
├── Task → image-reader (图片/UI 截图分析)
└── Task → reviewer (代码审查)
```

### 权限矩阵

| Agent | Mode | read | write | edit | bash | grep | task | question | skill |
|-------|------|------|-------|------|------|------|------|----------|-------|
| leader | primary | ✅ | 仅 plan 目录 | 仅 plan 目录 | ❌ | ❌ | 白名单 6 个 | ✅ | ❌ |
| analyzer | subagent | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| coder | subagent | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| git-manager | subagent | ✅ | ❌ | ❌ | 仅 git 命令 | ❌ | ❌ | ❌ | ❌ |
| image-reader | subagent | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| reviewer | subagent | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

## 安装

```bash
npm install php-flow-agent
```

### 配置

在 `~/.config/opencode/opencode.json` 中添加：

```json
{
  "plugin": ["php-flow-agent@git+https://github.com/hub-rb/php-flow-agent.git"]
}
```

### 本地开发

```bash
git clone <repo-url>
cd php-flow-agent
bun install
bun run typecheck
bun run build
bun test
```

## 自定义配置

可通过创建 `~/.config/opencode/php-flow-agent.json` 覆盖默认配置：

```json
{
  "agents": {
    "analyzer": { "model": "openai/gpt-4o" }
  },
  "primaryModel": "alibaba-coding-plan-cn/glm-5",
  "logging": {
    "console": true,
    "file": true,
    "level": "info"
  }
}
```

## 工作流程

```
用户输入 → Task(analyzer)
    ↓
analyzer 输出任务清单（带依赖关系）
    ↓
leader 创建 PLAN.md → 用户确认
    ↓
按阶段执行（并发/顺序分阶段）
    ↓
每阶段完成后 Task(review)
    ↓
通过 → 进入下一阶段
返工 → 最多 3 次 → 超限标记失败
```

## 项目结构

```
php-flow-agent/
├── src/
│   ├── index.ts              # Plugin 主入口
│   ├── types.ts              # 类型定义
│   ├── agents/
│   │   ├── index.ts          # Agent 注册表
│   │   ├── leader.ts         # 主编排代理
│   │   ├── analyzer.ts       # 需求分析代理
│   │   ├── coder.ts          # 编码实现代理
│   │   ├── git-manager.ts    # Git 管理代理
│   │   ├── image-reader.ts   # 图片分析代理
│   │   └── reviewer.ts       # 代码审查代理
│   └── utils/
│       └── logger.ts         # 日志服务
├── tests/
│   ├── types.test.ts         # 类型定义测试
│   ├── test-hooks.js         # Hook 功能验证
│   ├── test-plugin.js        # 插件调用模拟
│   └── test-spread.js        # 对象展开行为测试
├── package.json
├── tsconfig.json
└── README.md
```

## 许可证

MIT

## 参考

- [OpenCode SDK 文档](https://opencode.ai/docs/sdk)
- [OpenCode Plugin 文档](https://opencode.ai/docs/plugins)
