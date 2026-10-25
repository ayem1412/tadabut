import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

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

/**
 * Creates a live text editor.
 *
 * Internal: Tadabut calls it when a row starts being edited.
 *
 * @param options The editor config from the column.
 * @param context The starting value, the classes and the change callback.
 */
export function createTextEditor(
  config: TextEditor,
  context: EditorContext<string>,
): EditorInstance<string> {
  const input = document.createElement('input');
  input.type = 'text';
  addClasses(input, ['tdb-input', 'tdb-input-text'], context.className);

  if (config.minLength !== undefined) {
    input.minLength = config.minLength;
  }

  if (config.maxLength !== undefined) {
    input.maxLength = config.maxLength;
  }

  if (config.pattern !== undefined) {
    input.pattern = config.pattern;
  }

  // A nullable column can hold null: show it as an empty input.
  input.value = context.value ?? '';

  input.addEventListener('input', () => context.onChange(input.value));

  return {
    element: input,
    getValue: () => input.value,
    setValue: (value) => {
      input.value = value ?? '';
    },
    focus: () => input.focus(),
    destroy: () => input.remove(),
  };
}
