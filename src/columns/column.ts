/**
 * One column of a Tadabut table.
 *
 * @typeParam Row - The shape of one row. `prop` must be one of its keys.
 */
export type Column<Row extends object> = {
  /** Text shown in the column header. */
  readonly title: string;
  /** Name of the row property shown in this column. */
  readonly prop: keyof Row & string;
};
