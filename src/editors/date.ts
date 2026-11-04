import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

/**
 * For `string` columns holding `'YYYY-MM-DD'`. Anything else, like
 * `'2024-01-05T00:00:00'`, shows as empty and saves as `null`. Empty gives
 * `null`.
 *
 * @example
 * { type: 'date', min: '2020-01-01', max: '2030-12-31' }
 */
export type DateEditor = BaseEditor & {
  /** Picks this editor. */
  readonly type: 'date';
  /** Earliest date, as `'YYYY-MM-DD'`. */
  readonly min?: string;
  /** Latest date, as `'YYYY-MM-DD'`. */
  readonly max?: string;
};

/** Builds the date input. */
export function createDateEditor(
  config: DateEditor,
  context: EditorContext<string | null>,
): EditorInstance<string | null> {
  const input = document.createElement('input');
  input.type = 'date';
  addClasses(input, ['tdb-input', 'tdb-input-date'], context.className);

  if (config.min !== undefined) {
    input.min = config.min;
  }

  if (config.max !== undefined) {
    input.max = config.max;
  }

  /** Empty gives `null`. */
  const getValue = (): string | null => (input.value === '' ? null : input.value);

  /** `null` shows as empty. */
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
