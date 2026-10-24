import type { BaseEditor } from './base';

/**
 * A checkbox, for `boolean` columns. Checked means `true`.
 *
 * @example
 * { type: 'checkbox' }
 */
export type CheckboxEditor = BaseEditor & {
  readonly type: 'checkbox';
};
