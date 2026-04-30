import type { BuildMaxAgentConfig } from '@/types';
import { AGENT_NAMES } from '@/types';

export const buildMaxAgent: BuildMaxAgentConfig = {
  name: AGENT_NAMES.PRIMARY,
  description: '主编排代理，负责对话理解、验证判断、任务编排、进度追踪',
  mode: 'primary',
  permission: {
    // write/edit 只允许 docs/opencode/plan/** 目录
    write: { paths: ['docs/opencode/plan/**'] },
    edit: { paths: ['docs/opencode/plan/**'] },
    // 禁止其他危险操作
    bash: false,
    grep: false,
    glob: false,
    skill: false,
    // Task 白名单：只允许调用指定的 subagent
    task: {
      allowedAgents: [
        'build-max-analyzer',
        'build-max-coder',
        'build-max-reviewer',
        'build-max-image-reader',
        'build-max-git-manager',
        'explore',
      ],
    },
    read: true, // 允许读取文件用于验证
    question: true, // 允许与用户交互
  },
  tools: {
    grep: false,
    glob: false,
    skill: false,
  },
  promptPath: 'build-max',
};
