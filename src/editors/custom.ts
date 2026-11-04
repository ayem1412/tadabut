import type { BaseEditor } from './base';
import type { EditorContext, EditorInstance } from './instance';

/**
 * Bring your own editor (Select2, a date picker library…). Works on any
 * column, objects included. `create` runs every time a row is opened; call
 * `context.onChange` when the user changes the value.
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
  /** Picks this editor. */
  readonly type: 'custom';
  /** Builds your editor. Runs every time a row opens. */
  readonly create: (context: EditorContext<Value>) => EditorInstance<Value>;
};
