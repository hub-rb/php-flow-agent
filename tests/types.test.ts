import { describe, test, expect } from 'bun:test';
import { AGENT_NAMES, HOOK_PRIORITIES, DEFAULT_CONFIG } from '@/types';

describe('types.ts', () => {
  test('AGENT_NAMES 常量定义正确', () => {
    expect(AGENT_NAMES.PRIMARY).toBe('build-max');
    expect(AGENT_NAMES.ANALYZER).toBe('build-max-analyzer');
    expect(AGENT_NAMES.CODER).toBe('build-max-coder');
    expect(AGENT_NAMES.GIT_MANAGER).toBe('build-max-git-manager');
    expect(AGENT_NAMES.IMAGE_READER).toBe('build-max-image-reader');
    expect(AGENT_NAMES.REVIEWER).toBe('build-max-reviewer');
  });

  test('HOOK_PRIORITIES 常量定义正确', () => {
    expect(HOOK_PRIORITIES.PERMISSION_ENFORCER).toBe(100);
    expect(HOOK_PRIORITIES.CALL_TRACER).toBe(50);
    expect(HOOK_PRIORITIES.CONTEXT_INJECTOR).toBe(30);
    expect(HOOK_PRIORITIES.AUTO_COMPACT).toBe(10);
  });

  test('DEFAULT_CONFIG 配置正确', () => {
    expect(DEFAULT_CONFIG.MAX_TRACE_RECORDS).toBe(1000);
    expect(DEFAULT_CONFIG.COMPACT_THRESHOLD).toBe(0.5);
    expect(DEFAULT_CONFIG.PLAN_DIR).toBe('docs/opencode/plan');
  });
});
