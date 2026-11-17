import type { BaseEditor } from './base';
import { addClasses } from './classes';
import { type DateFormat, defaultDateFormat } from './date-format';
import { dataSeparator, formatDateTime, parseDateTime } from './datetime-format';
import type { EditorContext, EditorInstance } from './instance';

/**
 * For `string` columns holding a date and a time: the date in `format`, then
 * the time, like `'05/01/2024 14:30'`. With the default ISO format, a `T`
 * goes between them: `'2024-01-05T14:30'`.
 *
 * When reading, a `T` or a space both work, a date alone counts as midnight,
 * and what comes after the seconds (`.000Z`) is ignored: the time is shown as
 * written, not converted. Anything else shows as empty and saves as `null`.
 *
 * @example
 * { type: 'datetime', format: 'dd/mm/yyyy', min: '01/01/2020 08:00' }
 */
export type DateTimeEditor = BaseEditor & {
  /** Picks this editor. */
  readonly type: 'datetime';
  /**
   * How the date part is written in your rows. Defaults to `'yyyy-mm-dd'`.
   * The time always follows, as `hh:mm`.
   */
  readonly format?: DateFormat;
  /** How the cell shows the date part. Defaults to `format`. */
  readonly display?: DateFormat;
  /** Earliest date and time, written like the data: `'01/01/2020 08:00'`. */
  readonly min?: string;
  /** Latest date and time, written like the data. */
  readonly max?: string;
  /** Shows and saves the seconds. Defaults to `false`. */
  readonly seconds?: boolean;
};

/**
 * Builds the date-and-time input. The input itself always works in
 * `'yyyy-mm-ddThh:mm'`, so values are converted going in and out.
 */
export function createDateTimeEditor(
  config: DateTimeEditor,
  context: EditorContext<string | null>,
): EditorInstance<string | null> {
  const format = config.format ?? defaultDateFormat;
  const seconds = config.seconds ?? false;
  const separator = dataSeparator(format);

  const input = document.createElement('input');
  input.type = 'datetime-local';
  input.disabled = context.readOnly ?? false;
  addClasses(input, ['tdb-input', 'tdb-input-datetime'], context.className);

  // Without a step under a minute, the browser hides the seconds.
  if (seconds) {
    input.step = '1';
  }

  /** What the input wants: `'yyyy-mm-ddThh:mm'`, with `:ss` when seconds show. */
  const forInput = (value: string): string => (seconds ? value : value.slice(0, 16));

  // checkOptions already threw if these aren't real.
  if (config.min !== undefined) {
    input.min = forInput(parseDateTime(config.min, format) ?? '');
  }

  if (config.max !== undefined) {
    input.max = forInput(parseDateTime(config.max, format) ?? '');
  }

  /** Empty gives `null`. Otherwise written like the data. */
  const getValue = (): string | null => {
    // The input speaks ISO, whatever `format` is.
    const value = input.value === '' ? null : parseDateTime(input.value, defaultDateFormat);

    return value === null ? null : formatDateTime(value, format, seconds, separator);
  };

  /** `null`, or a value that isn't a date and time in `format`, shows as empty. */
  const setValue = (value: string | null): void => {
    const inside = value === null ? null : parseDateTime(value, format);
    input.value = inside === null ? '' : forInput(inside);
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
