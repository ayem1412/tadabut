import type { BaseEditor } from './base';
import { addClasses } from './classes';
import { type DateFormat, defaultDateFormat, formatDate, parseDate } from './date-format';
import type { EditorContext, EditorInstance } from './instance';

/**
 * For `string` columns holding a date written in `format`. A time after the
 * date is dropped. Anything else shows as empty and saves as `null`. Empty
 * gives `null`.
 *
 * @example
 * { type: 'date', format: 'dd/mm/yyyy', min: '01/01/2020' }
 */
export type DateEditor = BaseEditor & {
  /** Picks this editor. */
  readonly type: 'date';
  /** Earliest date, written in `format`. */
  readonly min?: string;
  /** Latest date, written in `format`. */
  readonly max?: string;
  /**
   * How the date is written in your rows: what the server sends and what
   * `onSave` gets. Defaults to `'yyyy-mm-dd'`.
   */
  readonly format?: DateFormat;
  /** How the cell shows it. Defaults to `format`. */
  readonly display?: DateFormat;
};

/**
 * Builds the date input. The input itself always works in `'yyyy-mm-dd'`,
 * whatever the computer's language, so values are converted going in and out.
 */
export function createDateEditor(
  config: DateEditor,
  context: EditorContext<string | null>,
): EditorInstance<string | null> {
  const format = config.format ?? defaultDateFormat;
  const input = document.createElement('input');
  input.type = 'date';
  addClasses(input, ['tdb-input', 'tdb-input-date'], context.className);

  if (config.min !== undefined) {
    input.min = parseDate(config.min, format) ?? '';
  }

  if (config.max !== undefined) {
    input.max = parseDate(config.max, format) ?? '';
  }

  /** Empty gives `null`. Otherwise the date in `format`. */
  const getValue = (): string | null =>
    input.value === '' ? null : formatDate(input.value, format);

  /** `null`, or a value that isn't a date in `format`, shows as empty. */
  const setValue = (value: string | null): void => {
    input.value = value === null ? '' : (parseDate(value, format) ?? '');
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
