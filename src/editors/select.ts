import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

/**
 * One choice in a select.
 *
 * @typeParam Value - The column's value type.
 */
export type SelectOption<Value> = {
  /** Text shown to the user. */
  readonly label: string;
  /** Value saved in the row when this choice is picked. */
  readonly value: Value;
};

/**
 * A dropdown list. Works for `string`, `number` and `boolean` columns.
 *
 * Option values must have the same type as the column: a `number` column
 * needs `value: 1`, not `value: '1'`.
 *
 * When the row's value matches no option (or is `null`), nothing is picked
 * and the editor gives `null`.
 *
 * @typeParam Value - The column's value type.
 *
 * @example
 * {
 *   type: 'select',
 *   options: [
 *     { value: 1, label: 'Morocco' },
 *     { value: 2, label: 'France' },
 *   ],
 * }
 */
export type SelectEditor<Value> = BaseEditor & {
  readonly type: 'select';
  /** The choices, in the order they are shown. */
  readonly options: readonly SelectOption<Value>[];
};

/**
 * Creates a live select editor.
 *
 * Internal: Tadabut calls it when a row starts being edited.
 *
 * HTML `<option>` values are always strings, so the picked value is read
 * from `config.options` by position, which keeps its real type (`1`, not
 * `'1'`).
 *
 * @param config The editor config from the column.
 * @param context The starting value and the change callback.
 */
export function createSelectEditor<Value>(
  config: SelectEditor<Value>,
  context: EditorContext<Value | null>,
): EditorInstance<Value | null> {
  const select = document.createElement('select');
  addClasses(select, ['tdb-input', 'tdb-input-select'], config.className);

  for (const option of config.options) {
    const element = document.createElement('option');
    element.textContent = option.label;
    select.appendChild(element);
  }

  const getValue = (): Value | null => config.options[select.selectedIndex]?.value ?? null;

  const setValue = (value: Value | null): void => {
    select.selectedIndex = config.options.findIndex((option) => option.value === value);
  };

  setValue(context.value);

  select.addEventListener('change', () => context.onChange(getValue()));

  return {
    element: select,
    getValue,
    setValue,
    focus: () => select.focus(),
    destroy: () => select.remove(),
  };
}
