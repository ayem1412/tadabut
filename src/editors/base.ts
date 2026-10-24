/**
 * Options shared by every editor.
 *
 * Internal: users never write this type. Its fields show up on each editor.
 */
export type BaseEditor = {
  /**
   * Extra CSS classes added to the input, next to Tadabut's own `tdb-…`
   * classes. Use it for Tailwind or Bootstrap classes, like `'form-control'`.
   */
  readonly className?: string;
};
