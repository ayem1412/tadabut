/** Characters that mean something in HTML. */
const entities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** DataTables inserts rendered cells as HTML, so labels go through this. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}
