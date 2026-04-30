/**
 * auto-compact.ts
 * 自动压缩 Hook - 优先级 10（最低）
 * 当上下文超过阈值时自动压缩会话
 */

import type { HookConfig, HookContext } from '@/types';
import { HOOK_PRIORITIES, DEFAULT_CONFIG } from '@/types';
import { logger } from '@/utils/logger';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';

// ============================================================================
// 上下文使用率追踪
// ============================================================================

/**
 * 会话上下文使用率追踪器
 * key: sessionId, value: 使用率 (0-1)
 */
const contextUsageTracker = new Map<string, number>();

/**
 * 压缩阈值（默认 50%）
 */
const COMPACT_THRESHOLD = DEFAULT_CONFIG.COMPACT_THRESHOLD;

// ============================================================================
// 压缩提示词格式化
// ============================================================================

/**
 * 格式化压缩提示词
 * 参考 micode 的 experimental.session.compacting hook
 * 生成结构化的会话摘要，用于压缩后继续会话
 */
function formatCompactionPrompt(sessionId: string, planStatus?: string): string {
  const planSection = planStatus
    ? `## PLAN.md 状态\n${planStatus}`
    : '## PLAN.md 状态\n(未检测到计划文件)';

  return `创建结构化摘要以继续此会话。使用以下格式：

# 会话摘要

## 目标
{核心目标 - 一句话描述成功标准}

## 约束与偏好
{技术要求、遵循模式、需避免事项 - 或 "(无)"}

## 进度
### 已完成
- [x] {已完成项及具体细节}

### 进行中
- [ ] {当前工作 - 正在处理的内容}

### 阻塞
- {阻碍进度的问题 - 或 "(无)"}

## 关键决策
- **{决策}**: {理由 - 为什么做出此选择}

## 下一步
1. {下一步行动的有序列表 - 需具体}

## 关键上下文
- {继续工作所需的数据、示例、引用或发现}
- {本会话的重要发现或见解}

${planSection}

重要：
- 保留精确的文件路径和函数名
- 聚焦于无缝继续所需的信息
- 具体说明已完成的工作，而非模糊摘要
- 包含遇到的任何错误消息或问题`;
}

// ============================================================================
// PLAN.md 内容获取
// ============================================================================

/**
 * 获取 PLAN.md 内容（用于压缩时保留任务状态）
 * @param cwd 工作目录
 * @returns PLAN.md 内容摘要，或 null
 */
async function getPlanContent(cwd: string): Promise<string | null> {
  const planDir = join(cwd, DEFAULT_CONFIG.PLAN_DIR);

  if (!existsSync(planDir)) {
    return null;
  }

  try {
    // 读取计划目录下的所有 markdown 文件
    const files = await readdir(planDir);
    const planFiles = files.filter(
      (file) => extname(file) === '.md',
    );

    if (planFiles.length === 0) {
      return null;
    }

    // 构建任务状态摘要
    const planContents: string[] = [];

    for (const file of planFiles) {
      const filePath = join(planDir, file);
      try {
        const content = await readFile(filePath, 'utf-8');
        // 提取任务状态标记（如 [x], [ ]）
        const taskLines = content
          .split('\n')
          .filter((line) => line.match(/-\s*\[[ xX]\]/))
          .slice(0, 20); // 限制每个文件最多 20 行任务

        if (taskLines.length > 0) {
          planContents.push(`### ${file}`);
          planContents.push(...taskLines);
        }
      } catch {
        // 单个文件读取失败，跳过
        continue;
      }
    }

    return planContents.length > 0
      ? planContents.join('\n')
      : '存在计划文件，但无明确任务状态标记';
  } catch {
    return null;
  }
}

// ============================================================================
// auto-compact Hook
// ============================================================================

/**
 * auto-compact Hook 配置
 * 监听 session.status 事件，监控上下文使用率
 * 当使用率超过阈值时，触发压缩建议
 */
export const autoCompactHook: HookConfig = {
  name: 'auto-compact',
  priority: HOOK_PRIORITIES.AUTO_COMPACT, // 10（最低优先级）
  event: 'session.status',

  handler: async (input: unknown, output: unknown) => {
    const context = input as HookContext;
    const { agentName, sessionId } = context;

    // 从 output 获取上下文使用率
    // OpenCode SDK 的 session.status 事件包含 contextUsage 信息
    const contextUsage = (output as { contextUsage?: number })?.contextUsage;

    if (contextUsage === undefined || contextUsage === null) {
      return;
    }

    // 更新追踪
    contextUsageTracker.set(sessionId, contextUsage);

    // 检查是否超过阈值
    if (contextUsage < COMPACT_THRESHOLD) {
      return;
    }

    const usagePercent = Math.round(contextUsage * 100);
    const thresholdPercent = Math.round(COMPACT_THRESHOLD * 100);

    logger.warn(
      `会话 ${sessionId} 上下文使用率 ${usagePercent}%，超过阈值 ${thresholdPercent}%`,
      { sessionId, usagePercent, thresholdPercent },
    );

    // 获取 PLAN.md 内容（用于压缩时保留任务状态）
    const cwd = process.cwd();
    const planContent = await getPlanContent(cwd);

    // 生成压缩提示词
    const compactionPrompt = formatCompactionPrompt(sessionId, planContent || undefined);

    // 记录压缩建议
    logger.info('建议触发会话压缩', {
      sessionId,
      promptLength: compactionPrompt.length,
      hasPlanContent: !!planContent,
    });

    // 实际压缩需要通过 OpenCode SDK 的 experimental.session.compacting 机制
    // 此 Hook 负责检测和准备压缩提示词，实际压缩由 SDK 处理
    // 可通过返回特定标记或调用 SDK API 来触发
  },
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取会话上下文使用率
 * @param sessionId 会话 ID
 * @returns 使用率 (0-1)，或 undefined（未追踪）
 */
export function getContextUsage(sessionId: string): number | undefined {
  return contextUsageTracker.get(sessionId);
}

/**
 * 清理会话追踪数据
 * @param sessionId 会话 ID
 */
export function cleanupSessionUsage(sessionId: string): void {
  contextUsageTracker.delete(sessionId);
  logger.debug(`已清理会话 ${sessionId} 的上下文使用率追踪`);
}

/**
 * 获取所有正在追踪的会话使用率
 * @returns 会话使用率映射表
 */
export function getAllSessionUsage(): Map<string, number> {
  return new Map(contextUsageTracker);
}
