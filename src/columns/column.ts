import type { EditorFor } from '../editors/editor';
import type { ValidationOptions } from '../validation/rules';
import type { TotalFor } from './total';

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
   * What the cell shows when the row isn't open. Text is shown as text, never
   * as HTML. An element goes into the cell as it is: build it with `html`, so
   * the values in it are escaped. Return a new element each time, or it moves
   * from cell to cell.
   *
   * Search uses its visible text and the raw value; sorting uses the raw
   * value. Totals go through it too.
   *
   * @example
   * render: (value) => `${value} MAD`
   *
   * @example
   * render: (value, row) => html`<span class="badge bg-${row.color}">${value}</span>`
   */
  readonly render?: (value: Row[Key], row: Row) => string | Node;
  /**
   * Adds a footer line with this column's total. It's formatted like the
   * cells: a money column shows `12 500.00`, and a `render` is used too.
   *
   * @example
   * total: 'sum'
   */
  readonly total?: TotalFor<Row[Key], Row>;
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
