import type { BaseEditor } from './base';

/**
 * A one-line text input, for `string` columns.
 *
 * The options match the HTML `<input>` attributes of the same name.
 *
 * @example
 * { type: 'text', minLength: 2, maxLength: 50 }
 */
export type TextEditor = BaseEditor & {
  readonly type: 'text';
  /** Fewest characters allowed. */
  readonly minLength?: number;
  /** Most characters allowed. The input stops accepting more. */
  readonly maxLength?: number;
  /**
   * A regular expression the whole value must match, written as a string,
   * like `'[A-Z]{2}[0-9]{4}'`. No `/…/` slashes and no `^` or `$`:
   * the browser always checks the full value.
   */
  readonly pattern?: string;
};
