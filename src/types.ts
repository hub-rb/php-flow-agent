import type { Plugin } from "@opencode-ai/plugin";

// ============================================================================
// OpenCode 标准 Agent 权限类型
// ============================================================================

/**
 * 权限动作配置
 * - "ask": 每次操作前询问用户
 * - "allow": 自动允许
 * - "deny": 拒绝执行
 */
export type PermissionAction = "ask" | "allow" | "deny";

/**
 * 权限对象配置（按路径/名称细分）
 * Key 是 glob pattern 或命令名，Value 是动作
 * 例如：{ "docs/**": "allow", "*": "deny" }
 */
export type PermissionObjectConfig = Record<string, PermissionAction>;

/**
 * 权限规则配置
 * 可以是单一动作，或按路径/名称细分的对象配置
 */
export type PermissionRuleConfig = PermissionAction | PermissionObjectConfig;

/**
 * OpenCode 标准 Agent 权限配置
 * 参考: https://opencode.ai/config.json
 */
export interface AgentPermission {
  /** 文件读取权限 */
  read?: PermissionRuleConfig;

  /** 文件编辑权限 */
  edit?: PermissionRuleConfig;

  /** 文件写入权限 */
  write?: PermissionRuleConfig;

  /** 文件匹配权限 */
  glob?: PermissionRuleConfig;

  /** 内容搜索权限 */
  grep?: PermissionRuleConfig;

  /** 目录列表权限 */
  list?: PermissionRuleConfig;

  /** Shell 执行权限 */
  bash?: PermissionRuleConfig;

  /** Task 调用权限（按 agent 名称细分） */
  task?: PermissionRuleConfig;

  /** 外部目录访问权限 */
  external_directory?: PermissionRuleConfig;

  /** TodoWrite 权限 */
  todowrite?: PermissionAction;

  /** 用户交互提问权限 */
  question?: PermissionAction;

  /** WebFetch 权限 */
  webfetch?: PermissionAction;

  /** WebSearch 权限 */
  websearch?: PermissionAction;

  /** CodeSearch 权限 */
  codesearch?: PermissionAction;

  /** LSP 权限 */
  lsp?: PermissionRuleConfig;

  /** DoomLoop 权限 */
  doom_loop?: PermissionAction;

  /** Skill 使用权限 */
  skill?: PermissionRuleConfig;
}

/**
 * Agent 运行模式
 * - primary: 主代理，可直接响应用户请求
 * - subagent: 子代理，仅能被其他 Agent 通过 task 调用
 */
export type AgentMode = "primary" | "subagent";

/**
 * Agent 配置（符合 OpenCode AgentConfig 标准）
 * 用于构建多代理系统中的单个 Agent 定义
 */
export interface BuildMaxAgentConfig {
  /** Agent 唯一标识名 */
  name: string;

  /** Agent 描述，用于 Agent 选择和任务分配 */
  description: string;

  /** 运行模式 */
  mode: AgentMode;

  /** 指定使用的模型，格式: provider/model（如 openai/gpt-4o） */
  model?: string;

  /** 权限配置（OpenCode 标准） */
  permission?: AgentPermission;

  /** 内联 prompt 提示词 */
  prompt?: string;

  /** 颜色配置 */
  color?: string;

  /** 最大迭代步数 */
  steps?: number;
}

// ============================================================================
// Plugin 配置类型
// ============================================================================

/**
 * 命令扩展配置
 * 定义可通过 OpenCode 命令触发的 Agent 调用模板
 */
export interface CommandExtension {
  /** 命令描述 */
  description: string;

  /** 关联的 Agent 名称 */
  agent: string;

  /** Prompt 模板字符串 */
  template: string;
}

/**
 * Plugin 完整配置
 * 定义整个 Build-Max 插件系统的所有配置项
 */
export interface PluginConfig {
  /** 插件名称 */
  name: string;

  /** 插件版本号（semver） */
  version: string;

  /** 插件描述（可选） */
  description?: string;

  /** Agent 配置映射，key 为 Agent 名称 */
  agents: Record<string, BuildMaxAgentConfig>;

  /** 命令扩展映射（可选） */
  commands?: Record<string, CommandExtension>;

  /** MCP 服务器扩展配置（可选） */
  mcp?: Record<string, unknown>;
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * Agent 名称常量
 * 集中管理所有 Agent 的标识名，避免硬编码字符串
 */
export const AGENT_NAMES = {
  PRIMARY: "leader",
  ANALYZER: "analyzer",
  CODER: "coder",
  GIT_MANAGER: "git-manager",
  IMAGE_READER: "image-reader",
  REVIEWER: "reviewer",
} as const;

/**
 * 默认配置常量
 */
export const DEFAULT_CONFIG = {
  /** 计划文件存储目录 */
  PLAN_DIR: "docs/opencode/plan",
} as const;

// ============================================================================
// Plugin 运行时类型
// ============================================================================

/** 用户配置文件结构 */
export interface UserConfig {
  agents?: Record<string, { model?: string; description?: string }>;
  primaryModel?: string;
  /** 日志配置 */
  logging?: {
    /** 是否启用控制台日志（默认 true） */
    console?: boolean;
    /** 是否启用文件日志（默认 true） */
    file?: boolean;
    /** 日志级别：debug | info | warn | error（默认 info） */
    level?: 'debug' | 'info' | 'warn' | 'error';
  };
}

/** 上下文存储条目 */
export interface ContextEntry {
  createdAt: string;
  traces: number;
}

/** Agent 默认配置结构 */
export interface AgentDefault {
  description: string;
  mode?: string;
  prompt: string;
}

/** OpenCode agent 注册表结构 */
export interface AgentRegistry {
  agent?: Record<string, unknown>;
}

// ============================================================================
// 类型导出（供外部模块使用）
// ============================================================================

export type { Plugin } from "@opencode-ai/plugin";
