import type { BuildMaxAgentConfig } from '@/types';
import { AGENT_NAMES } from '@/types';

export const coderAgent: BuildMaxAgentConfig = {
  name: AGENT_NAMES.CODER,
  description: '执行编码任务，遵循红线规则',
  mode: 'subagent',
  model: 'alibaba-coding-plan-cn/qwen3.6-plus',
  permission: {
    read: true,
    write: true,
    edit: true,
    bash: true,
    grep: true,
    glob: true,
  },
  tools: {
    write: true,
    edit: true,
    bash: true,
  },
  promptPath: 'build-max-coder',
};
