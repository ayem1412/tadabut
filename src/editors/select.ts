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
 * What a select's `options` function gets next to the row.
 */
export type OptionsContext = {
  /**
   * Aborted when the options aren't needed anymore: the field it depends on
   * changed again, or the row was closed. Pass it to `fetch` so old requests
   * stop.
   */
  readonly signal: AbortSignal;
};

/**
 * A select's options as a function of the row. It can return the list right
 * away, or a promise of it.
 *
 * @typeParam Value - The column's value type.
 * @typeParam Row - The shape of one row.
 */
export type SelectOptionsLoader<Value, Row> = (
  row: Row,
  context: OptionsContext,
) => readonly SelectOption<Value>[] | Promise<readonly SelectOption<Value>[]>;

/**
 * A dropdown list. Works for `string`, `number` and `boolean` columns.
 *
 * Option values must have the same type as the column: a `number` column
 * needs `value: 1`, not `value: '1'`.
 *
 * When the row's value matches no option (or is `null`), nothing is picked
 * and the editor gives `null`.
 *
 * `options` is either a fixed list, or a function of the row. Only a
 * function can have `dependsOn`: when that field changes, this select is
 * cleared and its options load again.
 *
 * @typeParam Value - The column's value type.
 * @typeParam Row - The shape of one row.
 *
 * @example
 * // A fixed list
 * { type: 'select', options: [{ value: 1, label: 'Morocco' }] }
 *
 * // Options that depend on another field
 * {
 *   type: 'select',
 *   dependsOn: 'countryId',
 *   options: (row, { signal }) => fetchCities(row.countryId, signal),
 * }
 */
export type SelectEditor<Value, Row> = BaseEditor & {
  readonly type: 'select';
} & (
    | {
        /** The choices, in the order they are shown. */
        readonly options: readonly SelectOption<Value>[];
        /** Only allowed when `options` is a function. */
        readonly dependsOn?: never;
      }
    | {
        /** Gives the choices for the row being edited. */
        readonly options: SelectOptionsLoader<Value, Row>;
        /**
         * Another field of the row. When it changes, this select is cleared
         * and `options` runs again.
         */
        readonly dependsOn?: keyof Row & string;
      }
  );

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
 * @param context The starting value, the classes and the change callback.
 */
export function createSelectEditor<Value, Row>(
  config: SelectEditor<Value, Row>,
  context: EditorContext<Value | null>,
): EditorInstance<Value | null> {
  const select = document.createElement('select');
  addClasses(select, ['tdb-input', 'tdb-input-select'], context.className);

  // TODO: load the options when they come from a function.
  const options: readonly SelectOption<Value>[] =
    typeof config.options === 'function' ? [] : config.options;

  for (const option of options) {
    const element = document.createElement('option');
    element.textContent = option.label;
    select.appendChild(element);
  }

  const getValue = (): Value | null => options[select.selectedIndex]?.value ?? null;

  const setValue = (value: Value | null): void => {
    select.selectedIndex = options.findIndex((option) => option.value === value);
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
