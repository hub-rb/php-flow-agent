# @build-max/plugin

OpenCode 多 Agent 编排插件，基于 @opencode-ai/plugin SDK 开发。

## 特性

- **多 Agent 编排**：primary agent（build-max）协调多个 subagent 执行复杂任务
- **权限强制**：通过 Hook 在工具调用前验证权限，拦截非法操作
- **调用链追踪**：记录 agent 间的调用关系，便于追溯和调试
- **上下文注入**：自动注入项目配置（AGENTS.md、composer.json）
- **自动压缩**：上下文超过阈值时自动压缩会话

## Agent 系统

### Agent 调用关系

```
build-max (主编排代理)
├── Task → build-max-analyzer (需求分析)
├── Task → build-max-coder (编码实现)
├── Task → build-max-git-manager (Git管理)
├── Task → build-max-image-reader (图片分析)
└── Task → build-max-reviewer (代码审查)
```

### Agent 权限矩阵

| Agent | Mode | write | edit | bash | grep | Task限制 |
|-------|------|-------|------|------|------|----------|
| build-max | primary | 仅 plan目录 | ❌ | ❌ | ❌ | 白名单5个 |
| analyzer | subagent | ❌ | ❌ | ❌ | ✅ | ❌ |
| coder | subagent | ✅ | ✅ | ✅ | ✅ | ❌ |
| git-manager | subagent | ❌ | ❌ | 仅git | ❌ | ❌ |
| image-reader | subagent | ❌ | ❌ | ❌ | ❌ | ❌ |
| reviewer | subagent | ❌ | ❌ | ❌ | ✅ | ❌ |

## 安装

### 从 npm 安装

```bash
npm install @build-max/plugin
```

### 配置

在 `~/.config/opencode/opencode.json` 中添加：

```json
{
  "plugin": ["@build-max/plugin"]
}
```

### 本地开发

```bash
# 克隆项目
git clone <repo-url>
cd php-flowagent

# 安装依赖
bun install

# 构建
bun run build

# 测试
bun test

# 类型检查
bun run typecheck
```

## Hook 系统

### Hook 优先级

| Hook | 优先级 | 功能 |
|------|--------|------|
| permission-enforcer | 100 | 验证工具调用权限 |
| call-tracer | 50 | 记录调用链 |
| context-injector | 30 | 注入项目配置 |
| auto-compact | 10 | 自动压缩上下文 |

### 自定义配置

可通过创建 `~/.config/opencode/build-max.json` 自定义配置：

```json
{
  "agents": {
    "analyzer": { "model": "openai/gpt-4o" }
  },
  "compactionThreshold": 0.5,
  "maxTraceRecords": 1000
}
```

## 工作流程

### 复杂需求处理流程

```
用户输入 → build-max 判断复杂度
    ↓
复杂需求 → Task(analyzer)
    ↓
analyzer 输出任务清单
    ↓
build-max 创建 PLAN.md
    ↓
按阶段执行（并发/顺序）
    ↓
每阶段完成后 Task(review)
    ↓
完成或返工
```

### 简单需求处理流程

```
用户输入 → build-max 判断为简单
    ↓
todowrite 任务列表
    ↓
Task(coder)
    ↓
Task(review)
    ↓
完成
```

## 项目结构

```
php-flowagent/
├── src/
│   ├── index.ts              # Plugin 主入口
│   ├── types.ts              # 类型定义
│   ├── agents/               # Agent 配置
│   │   ├── index.ts          # 注册表
│   │   ├── prompts/          # Markdown prompts
│   │   └── *.ts              # 各 agent 配置
│   ├── hooks/                # Hook 实现
│   │   ├── index.ts          # 注册表
│   │   └── *.ts              # 各 hook 实现
│   └── utils/                # 工具函数
├── tests/                    # 单元测试
├── package.json
├── tsconfig.json
└── README.md
```

## 许可证

MIT

## 参考

- [OpenCode SDK 文档](https://opencode.ai/docs/sdk)
- [OpenCode Plugin 文档](https://opencode.ai/docs/plugins)
- [micode 项目](https://github.com/vtemian/micode)
