/**
 * Works on every editor. An empty value fails `required` and skips every
 * other check. Otherwise the editor's own rules (`min`, `maxLength`…) run,
 * then `validate`. The first error wins.
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
  /** Does nothing on a checkbox, which is never empty. */
  readonly required?: boolean;
  /**
   * Return an error message, or `undefined` if the value is fine. `value`
   * can be `null` even on non-nullable columns, since empty inputs give
   * `null`.
   */
  readonly validate?: (value: Value | null, row: Row) => string | undefined;
};
