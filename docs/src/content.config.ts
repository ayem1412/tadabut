import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

/** The guides and the API pages, read from `src/content/docs/`. */
export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
