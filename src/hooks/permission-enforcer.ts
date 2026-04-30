/**
 * permission-enforcer.ts
 * 权限强制 Hook - 最高优先级（100）
 * 在工具调用前验证权限，拦截非法操作
 */

import type { HookConfig, HookContext, AgentPermission } from '@/types';
import { HOOK_PRIORITIES } from '@/types';
import { agents } from '@/agents';
import { logger } from '@/utils/logger';

/**
 * 检查路径是否匹配白名单模式
 * @param filePath 文件路径
 * @param patterns 白名单模式列表（支持 ** 通配符）
 */
export function matchPathPattern(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // 将 ** 转换为正则
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')  // ** 匹配任意路径
      .replace(/\*/g, '[^/]*') // * 匹配单级路径
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(filePath)) {
      return true;
    }
  }
  return false;
}

/**
 * 验证 write/edit 权限
 */
function validatePathPermission(
  permission: AgentPermission,
  toolName: string,
  filePath: string
): { allowed: boolean; reason?: string } {
  const permKey = toolName as keyof AgentPermission;
  const perm = permission[permKey];

  if (perm === false) {
    return { allowed: false, reason: `${toolName} 权限已禁用` };
  }

  if (perm === true) {
    return { allowed: true };
  }

  // 路径白名单模式
  if (typeof perm === 'object' && 'paths' in perm) {
    const paths = (perm as { paths?: string[] }).paths;
    if (paths && matchPathPattern(filePath, paths)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `${toolName} 仅允许路径: ${paths?.join(', ') || '无'}`,
    };
  }

  return { allowed: false, reason: `${toolName} 权限配置无效` };
}

/**
 * 验证 bash 权限
 */
function validateBashPermission(
  permission: AgentPermission,
  command: string
): { allowed: boolean; reason?: string } {
  const perm = permission.bash;

  if (perm === false) {
    return { allowed: false, reason: 'bash 权限已禁用' };
  }

  if (perm === true) {
    return { allowed: true };
  }

  // 命令白名单模式
  if (typeof perm === 'object') {
    // 检查 allowedCommands
    if ('allowedCommands' in perm) {
      const allowedCommands = (perm as { allowedCommands?: string[] }).allowedCommands;
      if (allowedCommands) {
        const cmdPrefix = command.trim().split(/\s+/)[0];
        if (!allowedCommands.includes(cmdPrefix)) {
          return {
            allowed: false,
            reason: `仅允许命令: ${allowedCommands.join(', ')}`,
          };
        }
      }
    }

    // 检查 validateCommand 函数
    if ('validateCommand' in perm && typeof (perm as { validateCommand?: unknown }).validateCommand === 'function') {
      const validateFn = (perm as { validateCommand: (cmd: string) => boolean }).validateCommand;
      if (!validateFn(command)) {
        return { allowed: false, reason: '命令验证失败' };
      }
    }

    return { allowed: true };
  }

  return { allowed: false, reason: 'bash 权限配置无效' };
}

/**
 * 验证 Task 权限（白名单）
 */
function validateTaskPermission(
  permission: AgentPermission,
  targetAgent: string
): { allowed: boolean; reason?: string } {
  const perm = permission.task;

  if (perm === false) {
    return { allowed: false, reason: 'Task 权限已禁用' };
  }

  if (perm === true) {
    return { allowed: true };
  }

  // Agent 白名单模式
  if (typeof perm === 'object' && 'allowedAgents' in perm) {
    const allowedAgents = (perm as { allowedAgents?: string[] }).allowedAgents;
    if (allowedAgents && allowedAgents.includes(targetAgent)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `仅允许调用: ${allowedAgents?.join(', ') || '无'}`,
    };
  }

  return { allowed: false, reason: 'Task 权限配置无效' };
}

/**
 * permission-enforcer Hook 配置
 */
export const permissionEnforcerHook: HookConfig = {
  name: 'permission-enforcer',
  priority: HOOK_PRIORITIES.PERMISSION_ENFORCER, // 100
  event: 'tool.execute.before',

  handler: async (input: unknown, output: unknown) => {
    const ctx = input as HookContext;
    const { agentName, toolName, toolArgs } = ctx;

    // 获取 agent 配置
    const agentConfig = agents[agentName];
    if (!agentConfig) {
      logger.warn(`未知的 agent: ${agentName}`);
      return; // 未配置的 agent 不强制
    }

    const permission = agentConfig.permission;

    // 根据工具类型验证权限
    let result: { allowed: boolean; reason?: string };

    switch (toolName) {
      case 'write':
      case 'edit': {
        const filePath = (toolArgs as { filePath?: string })?.filePath;
        if (!filePath) {
          logger.warn(`${toolName} 缺少 filePath 参数`);
          return;
        }
        result = validatePathPermission(permission, toolName, filePath);
        break;
      }

      case 'bash': {
        const command = (toolArgs as { command?: string })?.command;
        if (!command) {
          logger.warn('bash 缺少 command 参数');
          return;
        }
        result = validateBashPermission(permission, command);
        break;
      }

      case 'task': {
        const targetAgent = (toolArgs as { subagent_type?: string })?.subagent_type;
        if (!targetAgent) {
          logger.warn('task 缺少 subagent_type 参数');
          return;
        }
        result = validateTaskPermission(permission, targetAgent);
        break;
      }

      case 'grep':
        result = permission.grep === false
          ? { allowed: false, reason: 'grep 权限已禁用' }
          : { allowed: true };
        break;

      case 'glob':
        result = permission.glob === false
          ? { allowed: false, reason: 'glob 权限已禁用' }
          : { allowed: true };
        break;

      case 'skill': {
        if (permission.skill === false) {
          result = { allowed: false, reason: 'skill 权限已禁用' };
        } else if (typeof permission.skill === 'object' && 'allowed' in permission.skill) {
          // skill 白名单模式 - 需要从 toolArgs 获取 skill 名称
          const skillName = (toolArgs as { name?: string })?.name;
          const allowedSkills = (permission.skill as { allowed?: string[] }).allowed;
          if (skillName && allowedSkills && !allowedSkills.includes(skillName)) {
            result = { allowed: false, reason: `仅允许 skill: ${allowedSkills.join(', ')}` };
          } else {
            result = { allowed: true };
          }
        } else {
          result = { allowed: true };
        }
        break;
      }

      default:
        // 其他工具默认允许
        result = { allowed: true };
    }

    if (!result.allowed) {
      // 拦截非法操作 - 抛出错误阻止执行
      const errorMsg = `[${agentName}] 权限拦截: ${toolName} - ${result.reason}`;
      logger.warn(errorMsg);
      throw new Error(errorMsg);
    }

    logger.debug(`[${agentName}] 权限验证通过: ${toolName}`);
  },
};
