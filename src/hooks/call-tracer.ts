/**
 * call-tracer.ts
 * 调用链追踪 Hook - 优先级 50
 * 记录 agent 之间的调用关系，便于追溯和调试
 */

import type { HookConfig, HookContext, CallTraceRecord, CallTraceStore } from '@/types';
import { HOOK_PRIORITIES, DEFAULT_CONFIG } from '@/types';
import { logger } from '@/utils/logger';
import { appendFile, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// 调用链存储（内存 + 文件）
const traceStore: CallTraceStore = {
  records: [],
  maxRecords: DEFAULT_CONFIG.MAX_TRACE_RECORDS,
};

// 追踪文件路径
const TRACE_FILE = join(process.cwd(), 'logs', 'call-traces.json');

// 记录每个调用的开始时间，用于计算耗时
const startTimes = new Map<string, number>();

/**
 * 确保 logs 目录存在
 */
function ensureLogDir(): void {
  const logsDir = join(process.cwd(), 'logs');
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
}

/**
 * 截断过长的字符串，防止日志文件过大
 */
function truncate(str: string, maxLength: number = 500): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...[截断]';
}

/**
 * 生成唯一键用于匹配 before/after
 */
function generateTraceKey(sessionId: string, toolName: string, timestamp: number): string {
  return `${sessionId}:${toolName}:${timestamp}`;
}

/**
 * 添加追踪记录到内存和文件
 */
function addTraceRecord(record: CallTraceRecord): void {
  // 内存存储（轮转清理）
  if (traceStore.records.length >= traceStore.maxRecords) {
    traceStore.records.shift(); // 移除最旧的记录
  }
  traceStore.records.push(record);

  // 文件存储（异步追加）
  ensureLogDir();
  const logLine = JSON.stringify(record) + '\n';
  appendFile(TRACE_FILE, logLine, (err) => {
    if (err) {
      logger.warn('追踪记录写入文件失败', { error: err.message });
    }
  });
}

/**
 * call-tracer Hook 配置
 * 监听 tool.execute.after 事件，记录 Task 工具调用
 */
export const callTracerHook: HookConfig = {
  name: 'call-tracer',
  priority: HOOK_PRIORITIES.CALL_TRACER, // 50
  event: 'tool.execute.after',

  handler: async (input: unknown, output: unknown) => {
    const context = input as HookContext;
    const { agentName, sessionId, toolName, toolArgs } = context;
    const result = output;

    // 只追踪 Task 调用（agent 间调用）
    if (toolName !== 'task') {
      return;
    }

    const targetAgent = (toolArgs as { subagent_type?: string })?.subagent_type;
    if (!targetAgent) {
      return;
    }

    // 计算执行耗时
    const endTime = Date.now();
    const traceKey = generateTraceKey(sessionId, toolName, endTime);
    const startTime = startTimes.get(traceKey);
    const duration = startTime ? endTime - startTime : 0;

    // 构建追踪记录
    const record: CallTraceRecord = {
      timestamp: new Date().toISOString(),
      sessionId,
      callerAgent: agentName,
      targetAgent,
      input: truncate(JSON.stringify(toolArgs || {})),
      output: result ? truncate(JSON.stringify(result)) : undefined,
      duration,
      status: result ? 'success' : 'error',
    };

    addTraceRecord(record);

    logger.debug(`调用链追踪: ${agentName} → ${targetAgent}`, {
      sessionId,
      duration: `${duration}ms`,
      status: record.status,
    });
  },
};

/**
 * 记录工具调用开始时间（配合 after 事件计算耗时）
 * 注意：由于当前 Hook 只监听 after 事件，此处提供扩展接口
 */
export function recordToolStart(sessionId: string, toolName: string): void {
  const traceKey = generateTraceKey(sessionId, toolName, Date.now());
  startTimes.set(traceKey, Date.now());

  // 清理超过 1 小时的旧记录，防止内存泄漏
  setTimeout(() => {
    startTimes.delete(traceKey);
  }, 3600 * 1000);
}

/**
 * 获取所有追踪记录（返回副本，防止外部修改）
 */
export function getTraceRecords(): CallTraceRecord[] {
  return [...traceStore.records];
}

/**
 * 清空所有追踪记录
 */
export function clearTraceRecords(): void {
  traceStore.records = [];
  logger.info('调用链记录已清空');
}

/**
 * 清理特定会话的追踪记录
 */
export function cleanupSession(sessionId: string): void {
  const beforeCount = traceStore.records.length;
  traceStore.records = traceStore.records.filter(
    (record) => record.sessionId !== sessionId,
  );
  const removedCount = beforeCount - traceStore.records.length;
  logger.debug(`清理会话追踪记录`, { sessionId, removedCount });
}

/**
 * 获取特定会话的追踪记录
 */
export function getTracesBySession(sessionId: string): CallTraceRecord[] {
  return traceStore.records.filter(
    (record) => record.sessionId === sessionId,
  );
}

/**
 * 获取调用链树形结构（按会话组织）
 */
export function getTraceTree(sessionId: string): CallTraceRecord[] {
  const records = getTracesBySession(sessionId);
  // 按时间戳排序
  return records.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}
