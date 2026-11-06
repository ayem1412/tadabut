/** How a money input and its cells look. */
export type MoneyFormat = {
  /** Digits after the point. */
  readonly decimals: number;
  /** Between groups of thousands. */
  readonly separator: string;
  /** The decimal point that's shown. */
  readonly point: string;
};

/** `12 500.00`. */
export const defaultMoneyFormat: MoneyFormat = {
  decimals: 2,
  separator: ' ',
  point: '.',
};

/** `12500` → `'12 500.00'`, `null` → `''`. */
export function formatMoney(value: number | null, format: MoneyFormat): string {
  if (value === null) {
    return '';
  }

  const fixed = value.toFixed(format.decimals);
  const sign = fixed.startsWith('-') ? '-' : '';
  const [whole = '', decimals = ''] = fixed.slice(sign.length).split('.');
  const grouped = sign + groupThousands(whole, format.separator);

  return format.decimals > 0 ? grouped + format.point + decimals : grouped;
}

/** `'12 500,5'` → `12500.5`, rounded to `decimals`. Empty or not a number → `null`. */
export function parseMoney(text: string, format: MoneyFormat): number | null {
  let cleaned = text.replaceAll(format.separator, '').replace(/\s/g, '');

  for (const mark of decimalMarks(format)) {
    cleaned = cleaned.replaceAll(mark, '.');
  }

  if (cleaned === '') {
    return null;
  }

  const value = Number(cleaned);

  if (Number.isNaN(value)) {
    return null;
  }

  const factor = 10 ** format.decimals;

  // 1.005 * 100 is 100.4999… in floating point, which would round down.
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Cleans and regroups what's being typed, without filling in the decimals.
 * `'12500,5'` → `'12 500.5'`, `'12 500.'` stays, `'12.345'` → `'12.34'`.
 */
export function formatTyping(text: string, format: MoneyFormat): string {
  const trimmed = text.trim();
  const sign = trimmed.startsWith('-') ? '-' : '';
  const marks = decimalMarks(format);
  const markAt = [...trimmed].findIndex((char) => marks.includes(char));
  const hasMark = markAt !== -1;

  const before = hasMark ? trimmed.slice(0, markAt) : trimmed;
  const after = hasMark ? trimmed.slice(markAt + 1) : '';

  // Keeps a lone 0.
  let whole = before.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const decimals = after.replace(/\D/g, '').slice(0, format.decimals);
  const hasPoint = hasMark && format.decimals > 0;

  if (whole === '' && hasPoint) {
    whole = '0';
  }

  const grouped = sign + groupThousands(whole, format.separator);

  return hasPoint ? grouped + format.point + decimals : grouped;
}

/**
 * Counts the characters before `end` that survive formatting: digits,
 * decimal marks and the minus. Formatting adds and removes separators, which
 * would move the cursor. Counting only what stays, before and after, puts it
 * back in the same place.
 */
export function countKept(text: string, end: number, format: MoneyFormat): number {
  return [...text.slice(0, end)].filter((char) => isKept(char, format)).length;
}

/** The position right after the `kept`-th kept character. See `countKept`. */
export function caretAt(formatted: string, kept: number, format: MoneyFormat): number {
  if (kept <= 0) {
    return 0;
  }

  let seen = 0;

  for (const [index, char] of [...formatted].entries()) {
    if (isKept(char, format)) {
      seen += 1;
    }

    if (seen === kept) {
      return index + 1;
    }
  }

  return formatted.length;
}

/** A digit, a decimal mark or the minus. */
function isKept(char: string, format: MoneyFormat): boolean {
  return /\d/.test(char) || char === '-' || decimalMarks(format).includes(char);
}

/**
 * The keys accepted as a decimal point: the shown one, `.` and `,`, except
 * the separator. With `separator: '.'`, only `,` is a point.
 */
function decimalMarks(format: MoneyFormat): string[] {
  return [...new Set([format.point, '.', ','])].filter((mark) => mark !== format.separator);
}

/** `'12500'` → `'12 500'`. */
function groupThousands(digits: string, separator: string): string {
  // A spot inside the number with a multiple of 3 digits after it.
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}
