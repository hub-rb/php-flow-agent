import { describe, test, expect } from 'bun:test';
import { AGENT_NAMES, DEFAULT_CONFIG } from '@/types';

describe('types.ts', () => {
  test('AGENT_NAMES 常量定义正确', () => {
    expect(AGENT_NAMES.PRIMARY).toBe('leader');
    expect(AGENT_NAMES.ANALYZER).toBe('analyzer');
    expect(AGENT_NAMES.CODER).toBe('coder');
    expect(AGENT_NAMES.GIT_MANAGER).toBe('git-manager');
    expect(AGENT_NAMES.IMAGE_READER).toBe('image-reader');
    expect(AGENT_NAMES.REVIEWER).toBe('reviewer');
  });

  test('DEFAULT_CONFIG 配置正确', () => {
    expect(DEFAULT_CONFIG.PLAN_DIR).toBe('docs/opencode/plan');
  });
});
