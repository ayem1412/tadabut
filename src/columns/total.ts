/** The totals that need numbers. `null` and empty cells are skipped. */
export type NumberTotal = 'sum' | 'avg' | 'min' | 'max';

/**
 * Gets the counted rows and returns the text to show. It's shown as text,
 * not HTML.
 *
 * @example
 * total: (rows) => `${rows.filter((row) => row.active).length} active`
 */
export type TotalFunction<Row extends object> = (rows: readonly Row[]) => string;

// Wrapped in [] so a union like 1 | 2 isn't distributed.
/**
 * What a column's `total` can be: `sum`, `avg`, `min` and `max` only on
 * number columns. `count` and a function work everywhere.
 */
export type TotalFor<Value, Row extends object> = [NonNullable<Value>] extends [number]
  ? NumberTotal | 'count' | TotalFunction<Row>
  : 'count' | TotalFunction<Row>;
