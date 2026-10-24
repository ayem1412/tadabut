import type { BaseEditor } from './base';

/**
 * One choice in a select.
 *
 * @typeParam Value - The column's value type.
 */
export type SelectOption<Value> = {
  /** Text shown to the user. */
  readonly label: string;
  /** Value saved in the row when this choice is picked. */
  readonly value: Value;
};

/**
 * A dropdown list. Works for `string`, `number` and `boolean` columns.
 *
 * Option values must have the same type as the column: a `number` column
 * needs `value: 1`, not `value: '1'`.
 *
 * @typeParam Value - The column's value type.
 *
 * @example
 * {
 *   type: 'select',
 *   options: [
 *     { value: 1, label: 'Morocco' },
 *     { value: 2, label: 'France' },
 *   ],
 * }
 */
export type SelectEditor<Value> = BaseEditor & {
  readonly type: 'select';
  /** The choices, in the order they are shown. */
  readonly options: readonly SelectOption<Value>[];
};
