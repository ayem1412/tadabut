import { type DateFormat, formatDate, parseDate } from './date-format';
import { formatTime, parseTime } from './time-format';

/**
 * Reads a date in `format`, then a time after a `T` or a space, and gives
 * `'yyyy-mm-ddThh:mm:ss'`. No time means midnight. A time zone is ignored,
 * not converted. `null` if the date or the time isn't real.
 *
 * @example
 * parseDateTime('05/01/2024 14:30', 'dd/mm/yyyy'); // '2024-01-05T14:30:00'
 */
export function parseDateTime(value: string, format: DateFormat): string | null {
  const text = value.trim();
  const at = text.search(/[T ]/);

  const date = parseDate(at === -1 ? text : text.slice(0, at), format);
  const time = parseTime(at === -1 ? '00:00' : text.slice(at + 1));

  return date === null || time === null ? null : `${date}T${time}`;
}

/**
 * Writes a date-time `parseDateTime` returned. `separator` goes between the
 * date and the time.
 *
 * @example
 * formatDateTime('2024-01-05T14:30:00', 'dd/mm/yyyy', false, ' '); // '05/01/2024 14:30'
 */
export function formatDateTime(
  value: string,
  format: DateFormat,
  seconds: boolean,
  separator: string,
): string {
  const [date = '', time = ''] = value.split('T');

  return `${formatDate(date, format)}${separator}${formatTime(time, seconds)}`;
}

/**
 * What goes between the date and the time in the rows: `T` for ISO, as
 * servers send it, a space otherwise.
 */
export function dataSeparator(format: DateFormat): string {
  return format === 'yyyy-mm-dd' ? 'T' : ' ';
}
