import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

/** `'[rocket] Getting started'` → `'Getting started'`. */
function withoutIcon(label: string): string {
  return label.replace(/^\[[^\]]*\]\s*/, '');
}

/**
 * The sidebar labels start with an icon name for Ion, like `[rocket]`. Ion's
 * sidebar hides it, but its Next and Previous links show it, so it's removed
 * there.
 */
export const onRequest = defineRouteMiddleware((context) => {
  const { prev, next } = context.locals.starlightRoute.pagination;

  if (prev !== undefined) {
    prev.label = withoutIcon(prev.label);
  }

  if (next !== undefined) {
    next.label = withoutIcon(next.label);
  }
});
