import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

/**
 * A date picker, for `string` columns holding dates as `'YYYY-MM-DD'`.
 *
 * The options match the HTML `<input type="date">` attributes of the same
 * name. An empty input gives `null`.
 *
 * The column must hold exactly `'YYYY-MM-DD'`. Any other format, like
 * `'2024-01-05T00:00:00'`, shows as an empty input, and saving would turn it
 * into `null`. Convert dates to `'YYYY-MM-DD'` before giving them to the
 * table.
 *
 * @example
 * { type: 'date', min: '2020-01-01', max: '2030-12-31' }
 */
export type DateEditor = BaseEditor & {
  readonly type: 'date';
  /** Earliest date allowed, as `'YYYY-MM-DD'`. */
  readonly min?: string;
  /** Latest date allowed, as `'YYYY-MM-DD'`. */
  readonly max?: string;
};

/**
 * Creates a live date editor.
 *
 * Internal: Tadabut calls it when a row starts being edited.
 *
 * @param config The editor config from the column.
 * @param context The starting value and the change callback.
 */
export function createDateEditor(
  config: DateEditor,
  context: EditorContext<string | null>,
): EditorInstance<string | null> {
  const input = document.createElement('input');
  input.type = 'date';
  addClasses(input, ['tdb-input', 'tdb-input-date'], config.className);

  if (config.min !== undefined) {
    input.min = config.min;
  }

  if (config.max !== undefined) {
    input.max = config.max;
  }

  const getValue = (): string | null => (input.value === '' ? null : input.value);

  const setValue = (value: string | null): void => {
    input.value = value ?? '';
  };

  setValue(context.value ?? null);

  input.addEventListener('input', () => context.onChange(getValue()));

  return {
    element: input,
    getValue,
    setValue,
    focus: () => input.focus(),
    destroy: () => input.remove(),
  };
}
