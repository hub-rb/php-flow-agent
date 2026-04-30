import type { BuildMaxAgentConfig } from '@/types';
import { AGENT_NAMES } from '@/types';

export const reviewerAgent: BuildMaxAgentConfig = {
  name: AGENT_NAMES.REVIEWER,
  description: '代码审查代理，对比需求检查完成度、代码质量、安全性能',
  mode: 'subagent',
  model: 'alibaba-coding-plan-cn/glm-5',
  permission: {
    read: true,
    write: false,
    edit: false,
    bash: false,
    grep: true,
    glob: false,
  },
  tools: {
    write: false,
    edit: false,
    bash: false,
  },
  promptPath: 'build-max-reviewer',
};
