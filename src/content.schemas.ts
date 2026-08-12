import { z } from 'astro/zod';

/**
 * Frontmatter schemas for the content collections.
 * Kept in a plain module (no `astro:content` imports) so they can be
 * imported both by `content.config.ts` and by unit tests.
 */

export const projectSchema = z.object({
  title: z.string(),
  description: z.string().max(160),
  featured: z.boolean().default(false),
  featuredOrder: z.number().optional(),
  thumbnail: z.string().optional(),
  tags: z.array(z.string()),
  techStack: z.array(z.string()),
  github: z.string().url().optional(),
  liveUrl: z.string().url().optional(),
  date: z.coerce.date(),
  ogImage: z.string().optional(),
});

export const blogSchema = z.object({
  title: z.string(),
  description: z.string().max(160),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  tags: z.array(z.string()),
  draft: z.boolean().default(false),
  readingTime: z.string().optional(),
  ogImage: z.string().optional(),
});
