import type { BaseEditor } from './base';

/**
 * A number input, for `number` columns.
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
