import type { BuildMaxAgentConfig } from '@/types';
import { AGENT_NAMES } from '@/types';

export const gitManagerAgent: BuildMaxAgentConfig = {
  name: AGENT_NAMES.GIT_MANAGER,
  description: 'Git操作管理，生成规范化commit文案',
  mode: 'subagent',
  model: 'minimax-cn-coding-plan/MiniMax-M2.7',
  permission: {
    read: true,
    write: false,
    edit: false,
    bash: {
      allowedCommands: ['git'],
      validateCommand: (cmd: string) => cmd.trim().startsWith('git'),
    },
    grep: false,
    glob: false,
  },
  tools: {
    write: false,
    edit: false,
  },
  promptPath: 'build-max-git-manager',
};
