import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Projects: one Markdown file per project in src/content/projects/
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      group: z.enum(['Work', 'Robots', 'Home and shop']),
      years: z.coerce.string().optional(),
      role: z.string().optional(),
      tools: z.array(z.string()).default([]),
      links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      order: z.number().default(100),
      draft: z.boolean().default(false),
    }),
});

// Posts: one Markdown file per post in src/content/posts/
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects, posts };
