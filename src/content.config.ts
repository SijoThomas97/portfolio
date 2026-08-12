import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectSchema, blogSchema } from './content.schemas';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: projectSchema,
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: blogSchema,
});

export const collections = { projects, blog };
