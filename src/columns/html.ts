import { escapeHtml } from './escape';

/**
 * Builds elements from HTML you write, for `render` and `detail`. Every
 * `${…}` value is escaped, so text from the server never becomes HTML.
 * Returns the element when there's one, or a fragment holding them all.
 *
 * Escaping doesn't protect everything:
 * - Always put attributes in quotes: `class="${x}"`, never `class=${x}`.
 *   Without quotes, a value with a space can add an attribute of its own.
 * - It doesn't check URLs: `href="${url}"` with a `javascript:` URL from the
 *   server still runs when clicked. Check the URLs you put in links yourself.
 *
 * @example
 * render: (value, row) => html`<span class="badge bg-${row.color}">${value}</span>`
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): Node {
  const markup = strings.reduce((built, part, index) => {
    const value = index < values.length ? values[index] : '';

    return built + part + escapeHtml(value === null || value === undefined ? '' : String(value));
  }, '');

  const template = document.createElement('template');
  template.innerHTML = markup.trim();

  const { childNodes } = template.content;

  return childNodes.length === 1 ? (childNodes[0] as Node) : template.content;
}
