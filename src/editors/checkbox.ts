import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

/**
 * A checkbox, for `boolean` columns. Checked means `true`.
 *
 * A `null` value shows as unchecked. The checkbox always gives back `true`
 * or `false`, never `null`.
 *
 * @example
 * { type: 'checkbox' }
 */
export type CheckboxEditor = BaseEditor & {
  readonly type: 'checkbox';
};

/**
 * Creates a live checkbox editor.
 *
 * Internal: Tadabut calls it when a row starts being edited.
 *
 * @param config The editor config from the column.
 * @param context The starting value and the change callback.
 */
export function createCheckboxEditor(
  config: CheckboxEditor,
  context: EditorContext<boolean | null>,
): EditorInstance<boolean> {
  const input = document.createElement('input');
  input.type = 'checkbox';
  addClasses(input, ['tdb-input', 'tdb-input-checkbox'], config.className);

  const setValue = (value: boolean | null): void => {
    input.checked = value === true;
  };

  setValue(context.value);

  input.addEventListener('change', () => context.onChange(input.checked));

  return {
    element: input,
    getValue: () => input.checked,
    setValue,
    focus: () => input.focus(),
    destroy: () => input.remove(),
  };
}
