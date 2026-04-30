import { readFile } from 'fs/promises';
import { join } from 'path';

export interface MarkdownPrompt {
  frontmatter: {
    description: string;
    mode: 'primary' | 'subagent';
    model?: string;
    permission?: Record<string, unknown>;
    tools?: Record<string, boolean>;
  };
  content: string;
  raw: string;
}

/**
 * 解析 markdown 文件的 frontmatter（YAML 格式）
 */
export function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; content: string } {
  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!frontmatterMatch) {
    return { frontmatter: {}, content: raw };
  }
  
  // 简单 YAML 解析（不依赖 yaml 库）
  const frontmatterStr = frontmatterMatch[1];
  const content = frontmatterMatch[2];
  
  const frontmatter: Record<string, unknown> = {};
  const lines = frontmatterStr.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      
      // 解析简单值
      if (value === 'true') frontmatter[key] = true;
      else if (value === 'false') frontmatter[key] = false;
      else if (value === 'allow' || value === 'deny') frontmatter[key] = value;
      else if (!isNaN(Number(value))) frontmatter[key] = Number(value);
      else frontmatter[key] = value;
    }
  }
  
  return { frontmatter, content };
}

/**
 * 加载 markdown prompt 文件
 * @param promptDir prompts 目录路径
 * @param agentName agent 名称（不含 .md 后缀）
 */
export async function loadMarkdownPrompt(
  promptDir: string,
  agentName: string
): Promise<MarkdownPrompt> {
  const filePath = join(promptDir, `${agentName}.md`);
  const raw = await readFile(filePath, 'utf-8');
  
  const { frontmatter, content } = parseFrontmatter(raw);
  
  return {
    frontmatter: {
      description: frontmatter.description as string || '',
      mode: frontmatter.mode as 'primary' | 'subagent' || 'subagent',
      model: frontmatter.model as string | undefined,
      permission: frontmatter.permission as Record<string, unknown> | undefined,
      tools: frontmatter.tools as Record<string, boolean> | undefined,
    },
    content: content.trim(),
    raw,
  };
}

/**
 * 加载所有 agent prompts
 * @param promptDir prompts 目录路径
 * @param agentNames agent 名称列表
 */
export async function loadAllPrompts(
  promptDir: string,
  agentNames: string[]
): Promise<Record<string, MarkdownPrompt>> {
  const prompts: Record<string, MarkdownPrompt> = {};
  
  for (const name of agentNames) {
    prompts[name] = await loadMarkdownPrompt(promptDir, name);
  }
  
  return prompts;
}
