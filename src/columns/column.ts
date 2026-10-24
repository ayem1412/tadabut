import type { EditorFor } from '../editors/editor';

/**
 * One column of a Tadabut table.
 *
 * `prop` picks the row property to show, and `editor` (optional) must fit
 * that property's type: a `number` property can't have a text editor.
 * A column without an `editor` is read-only.
 *
 * @typeParam Row - The shape of one row.
 *
 * @example
 * const columns: Column<Employee>[] = [
 *   { title: 'ID', prop: 'id' },
 *   { title: 'Age', prop: 'age', editor: { type: 'number', min: 18 } },
 * ];
 */
export type Column<Row extends object> = {
  readonly [Key in keyof Row & string]: ColumnFor<Row, Key>;
}[keyof Row & string];

/** The column for one row property. `Column` is the union of these. */
type ColumnFor<Row extends object, Key extends keyof Row & string> = {
  /** Text shown in the column header. */
  readonly title: string;
  /** Name of the row property shown in this column. */
  readonly prop: Key;
  /** How the value is edited. Leave it out for a read-only column. */
  readonly editor?: EditorFor<Row[Key]>;
};
