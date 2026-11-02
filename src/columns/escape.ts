/** The characters that mean something in HTML, and what replaces them. */
const entities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Makes text safe to put in HTML: `<b>` shows as the text `<b>`, and can
 * never become a tag or run code.
 *
 * Internal: DataTables puts what a column's `render` returns into the cell
 * as HTML, so every label goes through this first.
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}
