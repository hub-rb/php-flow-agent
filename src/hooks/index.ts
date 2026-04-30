/**
 * Hook 注册表
 * 聚合所有 Hook 配置，按优先级排序
 */

import type { HookConfig } from '@/types';
import { permissionEnforcerHook } from './permission-enforcer';
import { callTracerHook } from './call-tracer';
import { contextInjectorHook } from './context-injector';
import { autoCompactHook } from './auto-compact';

// 所有 Hook 配置
const allHooks: HookConfig[] = [
  permissionEnforcerHook,  // 优先级 100
  callTracerHook,          // 优先级 50
  contextInjectorHook,     // 优先级 30
  autoCompactHook,         // 优先级 10
];

/**
 * 按优先级排序（数字越大越先执行）
 */
export const hooks = allHooks.sort((a, b) => b.priority - a.priority);

/**
 * Hook 名称列表
 */
export const HOOK_NAMES = hooks.map((h) => h.name);

/**
 * 按事件类型分组
 */
export const hooksByEvent: Record<string, HookConfig[]> = {
  'tool.execute.before': hooks.filter((h) => h.event === 'tool.execute.before'),
  'tool.execute.after': hooks.filter((h) => h.event === 'tool.execute.after'),
  'session.created': hooks.filter((h) => h.event === 'session.created'),
  'session.status': hooks.filter((h) => h.event === 'session.status'),
};

// 导出各个 Hook（便于单独引用）
export {
  permissionEnforcerHook,
  callTracerHook,
  contextInjectorHook,
  autoCompactHook,
};

// 导入清理函数（用于会话结束时清理）
import { cleanupSession as cleanupCallTracerSession } from './call-tracer';
import { cleanupSessionContext as cleanupContextInjectorSession } from './context-injector';
import { cleanupSessionUsage as cleanupAutoCompactSession } from './auto-compact';

// 重新导出清理函数
export { cleanupCallTracerSession, cleanupContextInjectorSession, cleanupAutoCompactSession };

/**
 * 清理所有 Hook 的会话数据
 */
export function cleanupAllSessionHooks(sessionId: string): void {
  cleanupCallTracerSession(sessionId);
  cleanupContextInjectorSession(sessionId);
  cleanupAutoCompactSession(sessionId);
}
