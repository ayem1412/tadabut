import type { EditorFor } from '../editors/editor';
import type { ValidationOptions } from '../validation/rules';

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
 *   {
 *     title: 'Age',
 *     prop: 'age',
 *     editor: { type: 'number', required: true, min: 18 },
 *   },
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
  /**
   * How the value is edited, and its validation rules. Leave it out for a
   * read-only column.
   */
  readonly editor?: EditorFor<Row[Key], Row> & ValidationOptions<Row, Row[Key]>;
  /**
   * The text shown in the cell, when the row isn't being edited.
   *
   * Without it, a select with a fixed list shows its option's label, and
   * any other column shows its value as text.
   *
   * The result is shown as plain text, never as HTML. Searching uses it,
   * sorting still uses the raw value.
   *
   * @example
   * render: (value, row) => row.cityName
   * render: (value) => `${value} MAD`
   */
  readonly render?: (value: Row[Key], row: Row) => string;
  /** The column's width, like `'60px'` or `'20%'`. */
  readonly width?: string;
  /**
   * `false` hides the column. Its value stays in the row, and `onSave` still
   * gets it. A hidden column can't have an `editor`.
   */
  readonly visible?: boolean;
  /** `false`: clicking the header doesn't sort by this column. */
  readonly orderable?: boolean;
  /** `false`: the search box ignores this column. */
  readonly searchable?: boolean;
  /**
   * Classes added to this column's cells, header included, like
   * `'text-end'`. Not the input's classes: those go in the editor's
   * `className`.
   */
  readonly className?: string;
};
