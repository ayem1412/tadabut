import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

/**
 * A number input, for `number` columns.
 *
 * An empty input gives `null`, not `0`.
 *
 * The options match the HTML `<input type="number">` attributes of the same
 * name.
 *
 * @example
 * { type: 'number', min: 18, max: 65, step: 1 }
 */
export type NumberEditor = BaseEditor & {
  readonly type: 'number';
  /** Smallest value allowed. */
  readonly min?: number;
  /** Largest value allowed. */
  readonly max?: number;
  /**
   * Allowed gap between values, counted from `min` (or 0).
   * `1` allows only whole numbers, `0.01` allows cents, and `'any'` allows
   * any decimal. Default: `1`.
   */
  readonly step?: number | 'any';
};

/**
 * Creates a live number editor.
 *
 * Internal: Tadabut calls it when a row starts being edited.
 *
 * @param config The editor config from the column.
 * @param context The starting value and the change callback.
 */
export function createNumberEditor(
  config: NumberEditor,
  context: EditorContext<number | null>,
): EditorInstance<number | null> {
  const input = document.createElement('input');
  input.type = 'number';
  addClasses(input, ['tdb-input', 'tdb-input-number'], config.className);

  if (config.min !== undefined) {
    input.min = String(config.min);
  }

  if (config.max !== undefined) {
    input.max = String(config.max);
  }

  if (config.step !== undefined) {
    input.step = String(config.step);
  }

  const getValue = (): number | null => (input.value === '' ? null : input.valueAsNumber);

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
