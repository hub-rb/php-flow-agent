# Plan: build-max Agent 系统迁移到 TypeScript 插件

## Session
20260430-plugin-migration

## 创建时间
2026-04-30

## 原始需求
将现有的基于 markdown 文件的 build-max 多 agent 系统迁移到 TypeScript 插件形式，基于 @opencode-ai/plugin SDK 实现，保留权限控制、编排流程，支持 Hook 系统。

## 任务清单

### 阶段 1（并发）：项目基础搭建
- [√] 任务1：创建 npm 项目基础结构（package.json、tsconfig.json、.gitignore）
- [√] 任务2：定义 TypeScript 类型系统（types.ts）
- [√] 任务3：实现工具函数（markdown-loader、logger）

### 阶段 2（并发）：Agent 定义迁移（5个 subagent）
- [√] 任务5：迁移 build-max-analyzer 需求分析代理
- [√] 任务6：迁移 build-max-coder 编码实现代理
- [√] 任务7：迁移 build-max-git-manager Git管理代理
- [√] 任务8：迁移 build-max-image-reader 图片分析代理
- [√] 任务9：迁移 build-max-reviewer 代码审查代理

### 阶段 3（顺序）：核心集成
- [√] 任务4：迁移 build-max 主代理定义（primary agent）
- [√] 任务10：实现 Agent 注册表（agents/index.ts）

### 阶段 4（并发）：Hook 系统实现
- [√] 任务11：实现 permission-enforcer Hook（权限强制，优先级100）
- [√] 任务12：实现 call-tracer Hook（调用链追踪，优先级50）
- [√] 任务13：实现 context-injector Hook（上下文注入，优先级30）
- [√] 任务14：实现 auto-compact Hook（自动压缩，优先级10）

### 阶段 5（顺序）：Plugin 集成
- [√] 任务15：实现 Hook 注册表（hooks/index.ts，含优先级）
- [√] 任务16：实现 Plugin 主入口（src/index.ts）

### 阶段 6（并发）：完善和测试
- [√] 任务17：编写单元测试
- [√] 任务18：编写 README 文档和使用示例
- [√] 任务19：配置 npm 发布（.npmignore、版本号）

### 阶段 7（顺序）：最终验证
- [√] 任务20：集成测试和验证

---

## ✅ 项目完成

所有任务已完成，验证结果：
- TypeScript 类型检查：✅ 通过
- 单元测试：✅ 7 个测试全部通过
- 构建：✅ 成功生成 dist/index.js (25.34 KB)
- 项目结构：✅ 30 个文件完整

---

## 状态说明
- `[ ]` 待执行
- `[*]` 进行中（已下发Task）
- `[√]` 已完成
- `[!]` 已失败

## 技术方案要点

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

### Hook 优先级
| Hook | 优先级 | 功能 |
|------|--------|------|
| permission-enforcer | 100 | 验证工具调用权限 |
| call-tracer | 50 | 记录调用链 |
| context-injector | 30 | 注入项目配置 |
| auto-compact | 10 | 自动压缩上下文 |

## 风险评估
- @opencode-ai/plugin SDK API 需确认可用性 ✅ 已确认
- Agent prompt 迁移需逐个对比确保完整性 ✅ 已完成
- 权限规则转换需建立测试用例验证 ✅ 已完成