import { describe, test, expect } from 'bun:test';
import { matchPathPattern } from '@/hooks/permission-enforcer';

describe('permission-enforcer', () => {
  describe('matchPathPattern', () => {
    test('匹配 ** 通配符', () => {
      expect(matchPathPattern('docs/opencode/plan/test.md', ['docs/opencode/plan/**'])).toBe(true);
      expect(matchPathPattern('docs/test.md', ['docs/**'])).toBe(true);
      expect(matchPathPattern('src/index.ts', ['docs/**'])).toBe(false);
    });

    test('匹配 * 通配符', () => {
      expect(matchPathPattern('docs/test.md', ['docs/*.md'])).toBe(true);
      expect(matchPathPattern('docs/sub/test.md', ['docs/*.md'])).toBe(false);
    });
  });
});
