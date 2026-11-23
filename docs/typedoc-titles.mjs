// @ts-check
/**
 * Gives every API page the `title:` block Starlight needs, and drops the
 * page's own heading, which would show the title twice.
 *
 * No imports: TypeDoc runs through `pnpm dlx`, so its packages aren't in this
 * repo's node_modules.
 */

/** @param {import('typedoc').Application} app */
export function load(app) {
  // 'endPage' is typedoc-plugin-markdown's MarkdownPageEvent.END.
  app.renderer.on('endPage', (page) => {
    const isRoot = page.url === 'index.md';
    const title = isRoot ? 'API reference' : page.model.name;

    page.contents = `---\ntitle: ${JSON.stringify(title)}\n---\n\n${page.contents ?? ''}`;
  });
}
