import type { BuildMaxAgentConfig } from '@/types';
import { AGENT_NAMES } from '@/types';

export const analyzerAgent: BuildMaxAgentConfig = {
  name: AGENT_NAMES.ANALYZER,
  description: '分析需求，输出任务清单（带依赖关系），可调用brainstorming，可直接与用户交互',
  mode: 'subagent',
  model: 'alibaba-coding-plan-cn/glm-5',
  permission: {
    edit: false,
    bash: false,
    skill: true,
    question: true,
    read: true,
    write: false,
    grep: true,
  },
  tools: {
    write: false,
    edit: false,
    bash: false,
  },
  promptPath: 'build-max-analyzer',
};
