/**
 * Validation options. They go on any editor, built-in or custom.
 *
 * Checks run in this order, and the first error wins:
 * 1. Empty value (`null`, `undefined` or `''`): an error if `required`,
 *    otherwise no error and nothing else is checked.
 * 2. The editor's own rules, like `min` or `maxLength`.
 * 3. `validate`.
 *
 * @typeParam Row - The shape of one row.
 * @typeParam Value - The column's value type.
 *
 * @example
 * {
 *   type: 'number',
 *   required: true,
 *   min: 18,
 *   validate: (value, row) =>
 *     row.active && value !== null && value > 65
 *       ? 'Active employees must be 65 or younger'
 *       : undefined,
 * }
 */
export type ValidationOptions<Row, Value> = {
  /**
   * The value can't be empty. Has no effect on a checkbox, which is never
   * empty.
   */
  readonly required?: boolean;
  /**
   * Your own check. Return an error message, or `undefined` if the value is
   * fine. Runs last, only on values that passed the other rules.
   *
   * `value` can be `null`, because editors give `null` when empty, even on
   * columns that can't hold `null`.
   */
  readonly validate?: (value: Value | null, row: Row) => string | undefined;
};
