/**
 * build-max Plugin 主入口
 * 基于 @opencode-ai/plugin SDK 的多 Agent 编排系统
 */

import type { Plugin, Hooks } from '@opencode-ai/plugin';
import { agents, PRIMARY_AGENT_NAME, SUBAGENT_NAMES_LIST, AGENT_NAMES_LIST } from '@/agents';
import {
  hooks,
  hooksByEvent,
  permissionEnforcerHook,
  callTracerHook,
  contextInjectorHook,
  autoCompactHook,
  cleanupAllSessionHooks,
} from '@/hooks';
import { loadAllPrompts } from '@/utils/markdown-loader';
import { logger } from '@/utils/logger';

// Plugin 元信息
const PLUGIN_NAME = '@build-max/plugin';
const PLUGIN_VERSION = '1.0.0';

/**
 * 将 HookFunction 包装为 SDK 要求的 Promise<void> 返回类型
 */
function wrapHook(handler: (input: unknown, output: unknown) => Promise<void> | void) {
  return async (input: unknown, output: unknown): Promise<void> => {
    await handler(input, output);
  };
}

/**
 * build-max Plugin 实现
 */
const BuildMaxPlugin: Plugin = async (ctx) => {
  const { project, client, directory, worktree } = ctx;

  logger.info('build-max Plugin 初始化', {
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    projectId: project?.id,
    directory,
  });

  // 加载所有 Agent prompts
  const promptDir = `${directory}/src/agents/prompts`;
  try {
    const prompts = await loadAllPrompts(promptDir, AGENT_NAMES_LIST);
    logger.info(`已加载 ${Object.keys(prompts).length} 个 Agent prompts`);
  } catch (error) {
    logger.warn('部分 prompts 加载失败', { error });
  }

  // 构建返回的 Hooks 对象
  const hooksResult: Hooks = {
    // Config hook - 注入 agents
    config: async (config) => {
      // 注入我们的 agents（覆盖默认）
      config.agent = {
        ...config.agent, // 保留默认 agents
        // 添加我们的 agents（展开覆盖）
        ...Object.fromEntries(
          Object.entries(agents).map(([name, cfg]) => [name, {
            model: cfg.model,
            mode: cfg.mode,
            description: cfg.description,
            // 其他配置通过 prompt 文件注入
          }])
        ),
      };

      logger.info('已注入 agents 配置', {
        count: Object.keys(agents).length,
        primary: PRIMARY_AGENT_NAME,
      });
    },

    // Tool execute before hook - 权限验证
    'tool.execute.before': wrapHook(permissionEnforcerHook.handler),

    // Tool execute after hook - 调用链追踪
    'tool.execute.after': wrapHook(callTracerHook.handler),

    // 通用事件处理 - 处理 session 相关事件
    event: async ({ event }) => {
      // session.created 事件 - 上下文注入
      if (event.type === 'session.created') {
        const sessionId = event.properties?.info?.id;
        if (sessionId) {
          logger.debug(`会话创建: ${sessionId}`);
          // 触发上下文注入 hook
          await contextInjectorHook.handler({ sessionId, agentName: PRIMARY_AGENT_NAME }, {});
        }
      }

      // session.deleted 事件 - 清理
      if (event.type === 'session.deleted') {
        const sessionId = event.properties?.info?.id;
        if (sessionId) {
          cleanupAllSessionHooks(sessionId);
          logger.debug(`已清理会话 ${sessionId} 的 Hook 数据`);
        }
      }

      // session.status 事件 - 自动压缩检查
      if (event.type === 'session.status') {
        const sessionId = event.properties?.sessionID;
        if (sessionId) {
          await autoCompactHook.handler({ sessionId, agentName: PRIMARY_AGENT_NAME }, {});
        }
      }
    },
  };

  return hooksResult;
};

// 导出 Plugin
export { BuildMaxPlugin };

// 导出所有类型和组件（便于外部使用）
export * from '@/types';
export { agents, PRIMARY_AGENT_NAME, SUBAGENT_NAMES_LIST, AGENT_NAMES_LIST } from '@/agents';
export {
  hooks,
  hooksByEvent,
  permissionEnforcerHook,
  callTracerHook,
  contextInjectorHook,
  autoCompactHook,
  cleanupAllSessionHooks,
} from '@/hooks';
export { loadMarkdownPrompt, loadAllPrompts } from '@/utils/markdown-loader';
export { logger, log } from '@/utils/logger';

// 默认导出
export default BuildMaxPlugin;
