import type { AnyEditor } from '../editors/editor';
import type { ValidationOptions } from './rules';

/** An editor config with its rules, type erased. */
export type AnyValidatedEditor = AnyEditor & ValidationOptions<unknown, unknown>;

/** The error messages. English only until translations land. */
export const messages = {
  required: 'This field is required.',
  loadFailed: 'Could not load the options.',
  tooShort: (min: number) => `Must be at least ${min} characters.`,
  tooLong: (max: number) => `Must be at most ${max} characters.`,
  patternMismatch: 'Wrong format.',
  tooSmall: (min: number) => `Must be ${min} or more.`,
  tooLarge: (max: number) => `Must be ${max} or less.`,
  tooEarly: (min: string) => `Must be on or after ${min}.`,
  tooLate: (max: string) => `Must be on or before ${max}.`,
};

/** Returns the first error message, or `undefined`. */
export function validateValue(
  config: AnyValidatedEditor,
  value: unknown,
  row: unknown,
): string | undefined {
  if (value === null || value === undefined || value === '') {
    return config.required ? messages.required : undefined;
  }

  return builtInError(config, value) ?? config.validate?.(value, row);
}

/** The rules each built-in editor brings. */
function builtInError(config: AnyEditor, value: unknown): string | undefined {
  switch (config.type) {
    case 'text':
      return typeof value === 'string' ? textError(config, value) : undefined;

    case 'number':
      return typeof value === 'number' ? rangeError(config, value) : undefined;

    case 'date':
      // 'YYYY-MM-DD' strings compare correctly as text.
      return typeof value === 'string' ? dateError(config, value) : undefined;

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
): string | undefined {
  if (config.minLength !== undefined && value.length < config.minLength) {
    return messages.tooShort(config.minLength);
  }

  if (config.maxLength !== undefined && value.length > config.maxLength) {
    return messages.tooLong(config.maxLength);
  }

  if (config.pattern !== undefined && !matchesWhole(config.pattern, value)) {
    return messages.patternMismatch;
  }

  return undefined;
}

/** `min` and `max` for numbers. */
function rangeError(
  config: Extract<AnyEditor, { type: 'number' }>,
  value: number,
): string | undefined {
  if (config.min !== undefined && value < config.min) {
    return messages.tooSmall(config.min);
  }

  if (config.max !== undefined && value > config.max) {
    return messages.tooLarge(config.max);
  }

  return undefined;
}

/** `min` and `max` for dates. */
function dateError(
  config: Extract<AnyEditor, { type: 'date' }>,
  value: string,
): string | undefined {
  if (config.min !== undefined && value < config.min) {
    return messages.tooEarly(config.min);
  }

  if (config.max !== undefined && value > config.max) {
    return messages.tooLate(config.max);
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
