/** The separators a date format can use. */
type DateSeparator = '/' | '-' | '.';

/**
 * How a date is written: `dd`, `mm` and `yyyy` in any order, with `/`, `-`
 * or `.` between them.
 *
 * @example
 * 'dd/mm/yyyy'
 */
export type DateFormat = {
  [S in DateSeparator]:
    | `dd${S}mm${S}yyyy`
    | `mm${S}dd${S}yyyy`
    | `yyyy${S}mm${S}dd`
    | `yyyy${S}dd${S}mm`
    | `dd${S}yyyy${S}mm`
    | `mm${S}yyyy${S}dd`;
}[DateSeparator];

/** ISO, what `<input type="date">` and most servers use. */
export const defaultDateFormat: DateFormat = 'yyyy-mm-dd';

/**
 * Reads a date written in `format`, and gives it as `'yyyy-mm-dd'`. A time
 * after it is dropped. `null` if it isn't a real date, like `31/02/2024`.
 *
 * @example
 * parseDate('05/01/2024', 'dd/mm/yyyy'); // '2024-01-05'
 */
export function parseDate(value: string, format: DateFormat): string | null {
  const { separator, order } = partsOf(format);
  const [date = ''] = value.trim().split(/[T ]/);
  const pieces = date.split(separator);

  if (pieces.length !== 3) {
    return null;
  }

  const yyyy = pieces[order.indexOf('yyyy')] ?? '';
  const mm = pieces[order.indexOf('mm')] ?? '';
  const dd = pieces[order.indexOf('dd')] ?? '';

  if (!/^\d{4}$/.test(yyyy) || !/^\d{1,2}$/.test(mm) || !/^\d{1,2}$/.test(dd)) {
    return null;
  }

  const year = Number(yyyy);
  const month = Number(mm);
  const day = Number(dd);

  // JavaScript quietly turns 31 February into 2 March, so the numbers come back different.
  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/**
 * Writes a `'yyyy-mm-dd'` date in `format`. Only give it dates `parseDate`
 * returned: it checks nothing.
 *
 * @example
 * formatDate('2024-01-05', 'dd.mm.yyyy'); // '05.01.2024'
 */
export function formatDate(iso: string, format: DateFormat): string {
  const [yyyy = '', mm = '', dd = ''] = iso.split('-');
  const { separator, order } = partsOf(format);
  const pieces: Record<string, string> = { yyyy, mm, dd };

  return order.map((part) => pieces[part]).join(separator);
}

/** The separator and the order of the parts. */
function partsOf(format: DateFormat): {
  readonly separator: string;
  readonly order: readonly string[];
} {
  const separator = format.match(/[^a-z]/)?.[0] ?? '-';

  return { separator, order: format.split(separator) };
}
