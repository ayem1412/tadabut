import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

/**
 * For `number` columns. Empty gives `null`, not `0`. The options work like
 * the HTML attributes.
 *
 * @example
 * { type: 'number', min: 18, max: 65, step: 1 }
 */
export type NumberEditor = BaseEditor & {
  /** Picks this editor. */
  readonly type: 'number';
  /** Smallest value allowed. */
  readonly min?: number;
  /** Largest value allowed. */
  readonly max?: number;
  /** Defaults to `1`. Use `0.01` for cents, or `'any'`. */
  readonly step?: number | 'any';
};

/** Builds the number input. */
export function createNumberEditor(
  config: NumberEditor,
  context: EditorContext<number | null>,
): EditorInstance<number | null> {
  const input = document.createElement('input');
  input.type = 'number';
  addClasses(input, ['tdb-input', 'tdb-input-number'], context.className);

  if (config.min !== undefined) {
    input.min = String(config.min);
  }

  if (config.max !== undefined) {
    input.max = String(config.max);
  }

  if (config.step !== undefined) {
    input.step = String(config.step);
  }

  /** Empty gives `null`, not `0`. */
  const getValue = (): number | null => (input.value === '' ? null : input.valueAsNumber);

  /** `null` shows as empty. */
  const setValue = (value: number | null): void => {
    input.value = value === null ? '' : String(value);
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
