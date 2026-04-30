/**
 * Agent 注册表
 * 聚合所有 agent 配置，供 Plugin 主入口使用
 */

import type { BuildMaxAgentConfig } from '@/types';
import { buildMaxAgent } from './build-max';
import { analyzerAgent } from './analyzer';
import { coderAgent } from './coder';
import { gitManagerAgent } from './git-manager';
import { imageReaderAgent } from './image-reader';
import { reviewerAgent } from './reviewer';

// Agent 配置注册表
export const agents: Record<string, BuildMaxAgentConfig> = {
  // Primary Agent（主编排代理）
  [buildMaxAgent.name]: buildMaxAgent,

  // Subagents（子代理）
  [analyzerAgent.name]: analyzerAgent,
  [coderAgent.name]: coderAgent,
  [gitManagerAgent.name]: gitManagerAgent,
  [imageReaderAgent.name]: imageReaderAgent,
  [reviewerAgent.name]: reviewerAgent,
};

// 导出 Primary Agent 名称（用于 Plugin 配置）
export const PRIMARY_AGENT_NAME = buildMaxAgent.name;

// 导出所有 agent 配置（便于单独引用）
export {
  buildMaxAgent,
  analyzerAgent,
  coderAgent,
  gitManagerAgent,
  imageReaderAgent,
  reviewerAgent,
};

// Agent 名称列表（用于遍历）
export const AGENT_NAMES_LIST = Object.keys(agents);

// Subagent 名称列表（排除 primary）
export const SUBAGENT_NAMES_LIST = AGENT_NAMES_LIST.filter(
  (name) => agents[name].mode === 'subagent'
);
