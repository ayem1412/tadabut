import { defaultDateFormat, formatDate, parseDate } from '../editors/date-format';
import { formatDateTime, parseDateTime } from '../editors/datetime-format';
import type { AnyEditor } from '../editors/editor';
import { formatTime, parseTime } from '../editors/time-format';
import { en } from '../texts/en';
import type { Texts } from '../texts/texts';
import type { ValidationOptions } from './rules';

/** An editor config with its rules, type erased. */
export type AnyValidatedEditor = AnyEditor & ValidationOptions<unknown, unknown>;

/** Returns the first error message, or `undefined`. */
export function validateValue(
  config: AnyValidatedEditor,
  value: unknown,
  row: unknown,
  texts: Texts = en,
): string | undefined {
  if (value === null || value === undefined || value === '') {
    return config.required ? texts.required : undefined;
  }

  return builtInError(config, value, texts) ?? config.validate?.(value, row);
}

/** The rules each built-in editor brings. */
function builtInError(config: AnyEditor, value: unknown, texts: Texts): string | undefined {
  switch (config.type) {
    case 'text':
      return typeof value === 'string' ? textError(config, value, texts) : undefined;

    case 'number':
    case 'money':
      return typeof value === 'number' ? rangeError(config, value, texts) : undefined;

    case 'date':
      return typeof value === 'string' ? dateError(config, value, texts) : undefined;

    case 'time':
      return typeof value === 'string' ? timeError(config, value, texts) : undefined;

    case 'datetime':
      return typeof value === 'string' ? dateTimeError(config, value, texts) : undefined;

    case 'checkbox':
    case 'select':
    case 'custom':
      return undefined;

    default: {
      const missing: never = config;
      throw new Error(`Unknown editor: ${JSON.stringify(missing)}`);
    }
  }
}

/** `minLength`, `maxLength` and `pattern`. */
function textError(
  config: Extract<AnyEditor, { type: 'text' }>,
  value: string,
  texts: Texts,
): string | undefined {
  if (config.minLength !== undefined && value.length < config.minLength) {
    return texts.tooShort(config.minLength);
  }

  if (config.maxLength !== undefined && value.length > config.maxLength) {
    return texts.tooLong(config.maxLength);
  }

  if (config.pattern !== undefined && !matchesWhole(config.pattern, value)) {
    return texts.patternMismatch;
  }

  return undefined;
}

/** `min` and `max` for numbers. */
function rangeError(
  config: Extract<AnyEditor, { type: 'number' | 'money' }>,
  value: number,
  texts: Texts,
): string | undefined {
  if (config.min !== undefined && value < config.min) {
    return texts.tooSmall(config.min);
  }

  if (config.max !== undefined && value > config.max) {
    return texts.tooLarge(config.max);
  }

  return undefined;
}

/**
 * `min` and `max` for dates. Compared as `'yyyy-mm-dd'`, since `'15/03/1999'`
 * comes after `'01/01/2000'` as text. The message shows the limit as the
 * cells show dates.
 */
function dateError(
  config: Extract<AnyEditor, { type: 'date' }>,
  value: string,
  texts: Texts,
): string | undefined {
  const format = config.format ?? defaultDateFormat;
  const display = config.display ?? format;
  const date = parseDate(value, format);

  if (date === null) {
    return undefined;
  }

  // checkOptions already threw if min or max aren't real dates.
  const min = config.min === undefined ? null : parseDate(config.min, format);
  const max = config.max === undefined ? null : parseDate(config.max, format);

  if (min !== null && date < min) {
    return texts.tooEarly(formatDate(min, display));
  }

  if (max !== null && date > max) {
    return texts.tooLate(formatDate(max, display));
  }

  return undefined;
}

/**
 * `min` and `max` for times. Compared as `'hh:mm:ss'`, since `'9:05'` comes
 * after `'14:30'` as text.
 */
function timeError(
  config: Extract<AnyEditor, { type: 'time' }>,
  value: string,
  texts: Texts,
): string | undefined {
  const seconds = config.seconds ?? false;
  const time = parseTime(value);

  if (time === null) {
    return undefined;
  }

  // checkOptions already threw if min or max aren't real times.
  const min = config.min === undefined ? null : parseTime(config.min);
  const max = config.max === undefined ? null : parseTime(config.max);

  if (min !== null && time < min) {
    return texts.timeTooEarly(formatTime(min, seconds));
  }

  if (max !== null && time > max) {
    return texts.timeTooLate(formatTime(max, seconds));
  }

  return undefined;
}

/**
 * `min` and `max` for dates with a time. Compared as `'yyyy-mm-ddThh:mm:ss'`.
 * The message shows the limit as the cells show it.
 */
function dateTimeError(
  config: Extract<AnyEditor, { type: 'datetime' }>,
  value: string,
  texts: Texts,
): string | undefined {
  const format = config.format ?? defaultDateFormat;
  const display = config.display ?? format;
  const seconds = config.seconds ?? false;
  const dateTime = parseDateTime(value, format);

  if (dateTime === null) {
    return undefined;
  }

  // checkOptions already threw if min or max aren't real.
  const min = config.min === undefined ? null : parseDateTime(config.min, format);
  const max = config.max === undefined ? null : parseDateTime(config.max, format);

  if (min !== null && dateTime < min) {
    return texts.tooEarly(formatDateTime(min, display, seconds, ' '));
  }

  if (max !== null && dateTime > max) {
    return texts.tooLate(formatDateTime(max, display, seconds, ' '));
  }

  return undefined;
}

/**
 * Same rules as the HTML `pattern` attribute: whole value, `v` flag, and an
 * invalid pattern is ignored. The group stops `a|b` from becoming `^a|b$`.
 */
function matchesWhole(pattern: string, value: string): boolean {
  let regex: RegExp;

  try {
    regex = new RegExp(`^(?:${pattern})$`, 'v');
  } catch {
    return true;
  }

  return regex.test(value);
}
