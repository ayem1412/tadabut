/**
 * One column of a Tadabut table.
 */
export type Column = {
  /** Text shown in the column header. */
  readonly title: string;
  /** Name of the row property shown in this column. */
  readonly prop: string;
};
