import type { Plugin } from "@opencode-ai/plugin";

// ============================================================================
// Agent 权限类型
// ============================================================================

/**
 * Agent 权限配置
 * 定义 Agent 可使用的工具和操作范围
 */
export interface AgentPermission {
  /** 文件读取权限：true 表示完全开放，或限制为指定路径 */
  read?: boolean | { paths: string[] };

  /** 文件写入权限：true 表示完全开放，或限制为指定路径 */
  write?: boolean | { paths: string[] };

  /** 文件编辑权限：true 表示完全开放，或限制为指定路径 */
  edit?: boolean | { paths?: string[] };

  /** Shell 执行权限：true 表示完全开放，或限制命令列表/自定义验证 */
  bash?: boolean | {
    allowedCommands?: string[];
    validateCommand?: (cmd: string) => boolean;
  };

  /** 内容搜索权限 */
  grep?: boolean;

  /** 文件匹配权限 */
  glob?: boolean;

  /** Skill 使用权限：true 表示完全开放，或限制为指定 Skill 列表 */
  skill?: boolean | { allowed?: string[] };

  /** 用户交互提问权限 */
  question?: boolean;

  /** Task 调用权限（Agent 间调用的白名单） */
  task?: boolean | { allowedAgents?: string[] };
}

/**
 * Agent 运行模式
 * - primary: 主代理，可直接响应用户请求
 * - subagent: 子代理，仅能被其他 Agent 通过 task 调用
 */
export type AgentMode = "primary" | "subagent";

/**
 * Agent 配置（扩展 OpenCode AgentConfig）
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

  /** 权限配置 */
  permission: AgentPermission;

  /** 工具开关映射，key 为工具名，value 为是否启用 */
  tools?: Record<string, boolean>;

  /** Prompt 模板文件路径（markdown 格式） */
  promptPath?: string;
}

// ============================================================================
// Hook 类型
// ============================================================================

/**
 * Hook 优先级
 * 数字越大优先级越高，数值高的 Hook 先执行
 */
export type HookPriority = number;

/**
 * Hook 执行上下文
 * 在 Hook 触发时传递的运行时信息
 */
export interface HookContext {
  /** 当前 Agent 名称 */
  agentName: string;

  /** 会话 ID */
  sessionId: string;

  /** 触发 Hook 的工具名称（可选） */
  toolName?: string;

  /** 工具调用参数（可选） */
  toolArgs?: Record<string, unknown>;

  /** 工具执行结果（可选） */
  result?: unknown;
}

/**
 * Hook 函数类型
 * @param input - Hook 输入参数（工具调用前的请求参数）
 * @param output - Hook 输出参数（工具调用后的响应结果）
 */
export type HookFunction<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  output: TOutput,
) => Promise<void> | void;

/**
 * Hook 配置
 * 定义一个可注册到 OpenCode 插件系统的 Hook
 */
export interface HookConfig {
  /** Hook 名称，用于日志和调试 */
  name: string;

  /** 执行优先级，数值越大越先执行 */
  priority: HookPriority;

  /** 触发的事件名，如 "tool.execute.before" */
  event: string;

  /** 处理函数 */
  handler: HookFunction;
}

// ============================================================================
// 调用链追踪类型
// ============================================================================

/**
 * 单次 Agent 调用记录
 * 用于追踪 Agent 间的调用关系和执行状态
 */
export interface CallTraceRecord {
  /** 调用时间戳（ISO 8601 格式） */
  timestamp: string;

  /** 所属会话 ID */
  sessionId: string;

  /** 调用方 Agent 名称 */
  callerAgent: string;

  /** 被调用方 Agent 名称 */
  targetAgent: string;

  /** 调用输入参数 */
  input: unknown;

  /** 调用输出结果（可选） */
  output?: unknown;

  /** 调用耗时（毫秒） */
  duration: number;

  /** 调用状态 */
  status: "success" | "error" | "blocked";

  /** 错误信息（status 为 error 时填充） */
  errorMessage?: string;
}

/**
 * 调用链存储
 * 内存中的调用记录集合，带容量限制防止内存膨胀
 */
export interface CallTraceStore {
  /** 调用记录列表 */
  records: CallTraceRecord[];

  /** 最大记录数，超出时淘汰最旧的记录 */
  maxRecords: number;
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

  /** Hook 配置列表 */
  hooks: HookConfig[];

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
  PRIMARY: "build-max",
  ANALYZER: "build-max-analyzer",
  CODER: "build-max-coder",
  GIT_MANAGER: "build-max-git-manager",
  IMAGE_READER: "build-max-image-reader",
  REVIEWER: "build-max-reviewer",
} as const;

/**
 * Hook 优先级常量
 * 统一管理 Hook 的执行顺序
 */
export const HOOK_PRIORITIES = {
  /** 权限检查 - 最高优先级，确保所有操作经过权限验证 */
  PERMISSION_ENFORCER: 100,

  /** 调用链记录 - 中等优先级，记录所有 Agent 调用 */
  CALL_TRACER: 50,

  /** 上下文注入 - 较低优先级，注入额外上下文信息 */
  CONTEXT_INJECTOR: 30,

  /** 自动压缩 - 最低优先级，上下文超限时触发压缩 */
  AUTO_COMPACT: 10,
} as const;

/**
 * 默认配置常量
 */
export const DEFAULT_CONFIG = {
  /** 调用链最大记录数 */
  MAX_TRACE_RECORDS: 1000,

  /** 上下文使用率阈值，超过此比例触发自动压缩（50%） */
  COMPACT_THRESHOLD: 0.5,

  /** 计划文件存储目录 */
  PLAN_DIR: "docs/opencode/plan",
} as const;

// ============================================================================
// 类型导出（供外部模块使用）
// ============================================================================

export type { Plugin } from "@opencode-ai/plugin";
