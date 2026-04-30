import type { BuildMaxAgentConfig } from '@/types';
import { AGENT_NAMES } from '@/types';

export const imageReaderAgent: BuildMaxAgentConfig = {
  name: AGENT_NAMES.IMAGE_READER,
  description: '分析图片/UI截图/设计稿，返回结构化描述',
  mode: 'subagent',
  model: 'alibaba-coding-plan-cn/qwen3.6-plus',
  permission: {
    read: true,
    write: false,
    edit: false,
    bash: false,
    grep: false,
    glob: false,
  },
  tools: {
    write: false,
    edit: false,
    bash: false,
  },
  promptPath: 'build-max-image-reader',
};
