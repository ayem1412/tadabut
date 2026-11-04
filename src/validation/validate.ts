import type { AnyEditor } from '../editors/editor';
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
      return typeof value === 'number' ? rangeError(config, value, texts) : undefined;

    case 'date':
      // 'YYYY-MM-DD' strings compare correctly as text.
      return typeof value === 'string' ? dateError(config, value, texts) : undefined;

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
  config: Extract<AnyEditor, { type: 'number' }>,
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

/** `min` and `max` for dates. */
function dateError(
  config: Extract<AnyEditor, { type: 'date' }>,
  value: string,
  texts: Texts,
): string | undefined {
  if (config.min !== undefined && value < config.min) {
    return texts.tooEarly(config.min);
  }

  if (config.max !== undefined && value > config.max) {
    return texts.tooLate(config.max);
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
