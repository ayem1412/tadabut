import type { BaseEditor } from './base';

/**
 * A date picker, for `string` columns holding dates as `'YYYY-MM-DD'`.
 *
 * The options match the HTML `<input type="date">` attributes of the same
 * name.
 *
 * @example
 * { type: 'date', min: '2020-01-01', max: '2030-12-31' }
 */
export type DateEditor = BaseEditor & {
  readonly type: 'date';
  /** Earliest date allowed, as `'YYYY-MM-DD'`. */
  readonly min?: string;
  /** Latest date allowed, as `'YYYY-MM-DD'`. */
  readonly max?: string;
};
