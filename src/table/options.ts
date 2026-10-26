import type { Column } from '../columns/column';

/**
 * Options for creating a Tadabut table.
 *
 * @typeParam Row - The shape of one row. Usually worked out from `data`.
 */
export type TadabutOptions<Row extends object> = {
  /** The rows to show. One object per row. */
  readonly data: readonly Row[];
  /** The columns to show, in order. */
  readonly columns: readonly Column<Row>[];
  /**
   * Name of the row property that identifies each row, like `'id'`.
   * Its values must be unique strings or numbers.
   *
   * Required when a column has an `editor`: editing uses it to find rows.
   */
  readonly rowId?: keyof Row & string;
};
