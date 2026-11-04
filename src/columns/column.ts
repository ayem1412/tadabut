import type { EditorFor } from '../editors/editor';
import type { ValidationOptions } from '../validation/rules';

/**
 * A table column. The `editor` has to fit the type of `prop`, so a number
 * field can't get a text input. Columns without an editor are read-only.
 *
 * @example
 * const columns: Column<Employee>[] = [
 *   { title: 'ID', prop: 'id' },
 *   { title: 'Age', prop: 'age', editor: { type: 'number', required: true, min: 18 } },
 * ];
 */
export type Column<Row extends object> = {
  readonly [Key in keyof Row & string]: ColumnFor<Row, Key>;
}[keyof Row & string];

/** One column, for one field. `Column` is the union of these. */
type ColumnFor<Row extends object, Key extends keyof Row & string> = {
  /** Header text. */
  readonly title: string;
  /** The field this column shows. */
  readonly prop: Key;
  /** Makes the column editable. Leave it out for a read-only column. */
  readonly editor?: EditorFor<Row[Key], Row> & ValidationOptions<Row, Row[Key]>;
  /**
   * The cell's text when the row isn't open. It's shown as text, not HTML.
   * Search uses it; sorting still uses the raw value.
   *
   * @example
   * render: (value) => `${value} MAD`
   */
  readonly render?: (value: Row[Key], row: Row) => string;
  /** Like `'60px'` or `'20%'`. */
  readonly width?: string;
  /** Hidden columns still keep their value in the row, but can't be edited. */
  readonly visible?: boolean;
  /** `false` turns off sorting by this column. */
  readonly orderable?: boolean;
  /** `false` leaves this column out of the search. */
  readonly searchable?: boolean;
  /** Classes for the cells (header too), not for the input. */
  readonly className?: string;
};
