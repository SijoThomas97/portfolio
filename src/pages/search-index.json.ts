import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { withBase } from '../utils/links';
import { readingTime } from '../utils/readingTime';

/**
 * Build-time JSON index for client-side search + tag filtering across
 * projects and blog posts. Generated once at build time (this route
 * always prerenders — it has no request-time dependency), fetched once
 * by the search island on the client, then filtered entirely in memory.
 * No server, no third-party search service, no JS shipped anywhere
 * except the /projects and /blog pages that opt into the island.
 */
export const prerender = true;

export interface SearchEntry {
  type: 'project' | 'blog';
  id: string;
  title: string;
  description: string;
  tags: string[];
  url: string;
  date: string;
  meta: string;
}

export const GET: APIRoute = async () => {
  const projects = await getCollection('projects');
  const posts = await getCollection('blog', ({ data }) => data.draft !== true);

  const projectEntries: SearchEntry[] = projects.map((p) => ({
    type: 'project',
    id: p.id,
    title: p.data.title,
    description: p.data.description,
    tags: p.data.tags,
    url: withBase(`/projects/${p.id}`),
    date: p.data.date.toISOString(),
    meta: p.data.techStack.join(', '),
  }));

  const blogEntries: SearchEntry[] = posts.map((post) => ({
    type: 'blog',
    id: post.id,
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags,
    url: withBase(`/blog/${post.id}`),
    date: post.data.pubDate.toISOString(),
    meta: post.data.readingTime ?? readingTime(post.body),
  }));

  const entries = [...projectEntries, ...blogEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
