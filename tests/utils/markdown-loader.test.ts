import { describe, test, expect } from 'bun:test';
import { parseFrontmatter } from '@/utils/markdown-loader';

describe('markdown-loader', () => {
  describe('parseFrontmatter', () => {
    test('解析正确的 frontmatter', () => {
      const raw = `---
description: 测试代理
mode: subagent
---
# 内容`;

      const result = parseFrontmatter(raw);
      expect(result.frontmatter.description).toBe('测试代理');
      expect(result.frontmatter.mode).toBe('subagent');
      expect(result.content).toBe('# 内容');
    });

    test('处理无 frontmatter 的内容', () => {
      const raw = '# 纯内容';
      const result = parseFrontmatter(raw);
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe('# 纯内容');
    });
  });
});
