import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { projectSchema, blogSchema } from '../../src/content.schemas';

const root = process.cwd();
const projectsDir = join(root, 'src/content/projects');
const blogDir = join(root, 'src/content/blog');

function mdFiles(dir: string): string[] {
  return readdirSync(dir).filter((f) => /\.(md|mdx)$/.test(f));
}

describe('content collection schemas', () => {
  describe('every project frontmatter passes projectSchema', () => {
    for (const file of mdFiles(projectsDir)) {
      it(file, () => {
        const { data } = matter(readFileSync(join(projectsDir, file), 'utf8'));
        const result = projectSchema.safeParse(data);
        expect(
          result.success,
          result.success ? '' : JSON.stringify(result.error.issues, null, 2)
        ).toBe(true);
      });
    }
  });

  describe('every blog post frontmatter passes blogSchema', () => {
    for (const file of mdFiles(blogDir)) {
      it(file, () => {
        const { data } = matter(readFileSync(join(blogDir, file), 'utf8'));
        const result = blogSchema.safeParse(data);
        expect(
          result.success,
          result.success ? '' : JSON.stringify(result.error.issues, null, 2)
        ).toBe(true);
      });
    }
  });

  describe('projectSchema rules', () => {
    const valid = {
      title: 'Test Project',
      description: 'A short description.',
      tags: ['ml'],
      techStack: ['Python'],
      date: '2025-01-01',
    };

    it('accepts a minimal valid project and applies defaults', () => {
      const parsed = projectSchema.parse(valid);
      expect(parsed.featured).toBe(false);
      expect(parsed.date).toBeInstanceOf(Date);
    });

    it('rejects descriptions longer than 160 characters', () => {
      const long = { ...valid, description: 'x'.repeat(161) };
      expect(projectSchema.safeParse(long).success).toBe(false);
    });

    it('rejects invalid github URLs', () => {
      const bad = { ...valid, github: 'not-a-url' };
      expect(projectSchema.safeParse(bad).success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const { title: _title, ...noTitle } = valid;
      expect(projectSchema.safeParse(noTitle).success).toBe(false);
    });

    it('coerces date strings to Date objects', () => {
      expect(projectSchema.parse(valid).date.getFullYear()).toBe(2025);
    });
  });

  describe('blogSchema rules', () => {
    const valid = {
      title: 'Test Post',
      description: 'A short description.',
      pubDate: '2025-06-01',
      tags: ['astro'],
    };

    it('accepts a minimal valid post and defaults draft to false', () => {
      const parsed = blogSchema.parse(valid);
      expect(parsed.draft).toBe(false);
      expect(parsed.pubDate).toBeInstanceOf(Date);
    });

    it('rejects descriptions longer than 160 characters', () => {
      const long = { ...valid, description: 'x'.repeat(161) };
      expect(blogSchema.safeParse(long).success).toBe(false);
    });

    it('rejects a missing pubDate', () => {
      const { pubDate: _pubDate, ...noPubDate } = valid;
      expect(blogSchema.safeParse(noPubDate).success).toBe(false);
    });

    it('rejects non-array tags', () => {
      const bad = { ...valid, tags: 'astro' };
      expect(blogSchema.safeParse(bad).success).toBe(false);
    });
  });
});
