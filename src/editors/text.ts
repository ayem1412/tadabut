import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

/**
 * For `string` columns. The options work like the HTML attributes.
 *
 * @example
 * { type: 'text', minLength: 2, maxLength: 50 }
 */
export type TextEditor = BaseEditor & {
  /** Picks this editor. */
  readonly type: 'text';
  /** Fewest characters allowed. */
  readonly minLength?: number;
  /** Most characters allowed. */
  readonly maxLength?: number;
  /** Must match the whole value, like `'[A-Z]{2}[0-9]{4}'`. No slashes, no `^`/`$`. */
  readonly pattern?: string;
};

/** Builds the text input. `null` shows as empty. */
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
