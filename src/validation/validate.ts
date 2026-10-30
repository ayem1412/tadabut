import type { AnyEditor } from '../editors/editor';
import type { ValidationOptions } from './rules';

/**
 * An editor config with its validation rules, whatever the column type.
 *
 * Internal: the loose version of what users write in `Column<Row>`.
 */
export type AnyValidatedEditor = AnyEditor & ValidationOptions<unknown, unknown>;

/**
 * Error messages. Plain English for now. They will become an option when
 * translations are added.
 *
 * Internal: exported for the edit session, which shows `loadFailed`.
 */
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

/**
 * Checks a value against a column's rules.
 *
 * Internal: Tadabut calls it before saving a row.
 *
 * The checks run in this order, and the first error wins:
 * 1. Empty value (`null`, `undefined` or `''`): an error if `required`,
 *    otherwise no error and nothing else is checked. An empty optional field
 *    never fails a rule like `min`.
 * 2. The editor's own rules (`minLength`, `min`, and so on).
 * 3. The user's `validate`.
 *
 * @param config The editor config, with its validation rules.
 * @param value The value the editor gave.
 * @param row The row being edited.
 * @returns The error message, or `undefined` if the value is fine.
 */
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

/** Checks the rules that come with each built-in editor. */
function builtInError(config: AnyEditor, value: unknown): string | undefined {
  switch (config.type) {
    case 'text':
      return typeof value === 'string' ? textError(config, value) : undefined;

    case 'number':
      return typeof value === 'number' ? rangeError(config, value) : undefined;

    case 'date':
      // 'YYYY-MM-DD' sorts like the dates it holds, so text comparison works.
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
 * Checks that `pattern` matches the whole value, like the HTML `pattern`
 * attribute: same `v` flag, and an invalid pattern is ignored.
 *
 * The `(?:…)` keeps `^` and `$` around the whole pattern: without it,
 * `a|b` would become `^a|b$`, which means something else.
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
