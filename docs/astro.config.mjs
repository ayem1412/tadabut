// @ts-check
import { fileURLToPath } from 'node:url';

import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import rehypeRelativeMarkdownLinks from 'astro-rehype-relative-markdown-links';
import { ion } from 'starlight-ion-theme';

export default defineConfig({
  // The site lives at ayem1412.github.io/tadabut/.
  site: 'https://ayem1412.github.io',
  base: '/tadabut',
  markdown: {
    // The guides link to each other like `editing.md#dates`, so they also work on GitHub.
    // This turns those links into the site's URLs.
    processor: unified({
      rehypePlugins: [
        [
          rehypeRelativeMarkdownLinks,
          {
            // A full path: the build runs from the repo root, not from docs/.
            srcDir: fileURLToPath(new URL('./src', import.meta.url)),
            collectionBase: false,
            base: '/tadabut',
          },
        ],
      ],
    }),
  },
  integrations: [
    starlight({
      title: 'Tadabut',
      // A crayon drawing, so a PNG: an SVG can't keep its texture.
      logo: { src: './src/assets/logo.png' },
      favicon: '/favicon.png',
      // iPhones and iPads use this one when the site is saved to the home screen.
      head: [
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/tadabut/apple-touch-icon.png' } },
      ],
      description:
        'Editable, typed DataTables: inputs in the cells, validation, and selects that depend on each other.',
      plugins: [
        ion({
          // A full path: the build runs from the repo root, not from docs/.
          icons: { iconDir: fileURLToPath(new URL('./src/icons', import.meta.url)) },
          footer: {
            text: 'MIT License. Not affiliated with DataTables or SpryMedia.',
            links: [
              { text: 'GitHub', href: 'https://github.com/ayem1412/tadabut', newTab: true },
              { text: 'npm', href: 'https://www.npmjs.com/package/tadabut', newTab: true },
              {
                text: 'Changelog',
                href: 'https://github.com/ayem1412/tadabut/blob/master/CHANGELOG.md',
                newTab: true,
              },
              { text: 'Logo by Fraankyy', href: 'https://x.com/fraankyy2', newTab: true },
            ],
          },
        }),
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/ayem1412/tadabut' },
        { icon: 'npm', label: 'npm', href: 'https://www.npmjs.com/package/tadabut' },
      ],
      // Our own 404.md replaces Starlight's page.
      disable404Route: true,
      editLink: { baseUrl: 'https://github.com/ayem1412/tadabut/edit/master/docs/' },
      customCss: ['./src/styles/custom.css'],
      // Takes the icon names out of the Next and Previous links.
      routeMiddleware: './src/route-data.ts',
      // Adds the live demos under the guides' examples.
      components: { MarkdownContent: './src/components/MarkdownContent.astro' },
      sidebar: [
        {
          label: 'Guides',
          // Ion shows the `[name]` at the start of a label as an icon, from src/icons/
          items: [
            { label: '[rocket] Getting started', slug: 'getting-started' },
            { label: '[columns-3] Columns and cells', slug: 'columns' },
            { label: '[pencil] Editing', slug: 'editing' },
            { label: '[rows-3] Rows', slug: 'rows' },
            { label: '[server] Big tables', slug: 'server' },
            { label: '[bell] Events', slug: 'events' },
            { label: '[palette] Styling and texts', slug: 'styling' },
            { label: '[share-2] Sharing settings', slug: 'shared-defaults' },
            { label: '[atom] React', slug: 'react' },
            { label: '[code-xml] Vue', slug: 'vue' },
            { label: '[map] Roadmap', slug: 'roadmap' },
          ],
        },
        {
          // Made by `pnpm docs:api` from the code's comments.
          label: '[book-open] API reference',
          collapsed: true,
          items: [{ autogenerate: { directory: 'api' } }],
        },
      ],
    }),
  ],
});
