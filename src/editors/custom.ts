import type { BaseEditor } from './base';
import type { EditorContext, EditorInstance } from './instance';

/**
 * An editor you build yourself, like a Select2 dropdown or a date picker
 * library. Works on any column, including object columns that have no
 * built-in editor.
 *
 * Tadabut calls `create` each time a row starts being edited. It gets the
 * starting value (which can be `null` on a nullable column), the
 * `className` from this config, and an `onChange` to call when the user
 * changes the value.
 *
 * @typeParam Value - The column's value type, including `null` if the
 *   column can hold it.
 *
 * @example
 * {
 *   type: 'custom',
 *   create: (context) => {
 *     const input = document.createElement('input');
 *     input.value = context.value ?? '';
 *     input.addEventListener('input', () => context.onChange(input.value));
 *     return {
 *       element: input,
 *       getValue: () => input.value,
 *       setValue: (value) => { input.value = value ?? ''; },
 *       focus: () => input.focus(),
 *       destroy: () => input.remove(),
 *     };
 *   },
 * }
 */
export type CustomEditor<Value> = BaseEditor & {
  readonly type: 'custom';
  /** Builds the live editor. Called once per row edit. */
  readonly create: (context: EditorContext<Value>) => EditorInstance<Value>;
};
