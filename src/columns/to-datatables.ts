import type { ColumnOptions } from 'datatables.net';

import type { AnyEditor } from '../editors/editor';
import type { Column } from './column';
import { escapeHtml } from './escape';

/**
 * The last column, with the Edit button. When a row is being edited, its
 * cell holds Save and Cancel instead.
 *
 * The HTML is a string because it is our own fixed text, never user data,
 * so nothing in it can run code.
 */
const actionsColumn: ColumnOptions = {
  title: '',
  data: null,
  className: 'tdb-actions',
  // Nobody sorts by buttons, and searching "Edit" shouldn't match every row.
  orderable: false,
  searchable: false,
  defaultContent:
    '<button type="button" class="tdb-button tdb-button-edit" data-tdb-action="edit">Edit</button>',
};

/**
 * A column with its value type forgotten. `Column<Row>` is a union with one
 * member per row property, so its `render` can't be called with a value of
 * unknown type until it's loosened like this.
 */
type LooseColumn<Row> = {
  readonly render?: (value: unknown, row: Row) => string;
  readonly editor?: AnyEditor;
};

/**
 * Turns Tadabut columns into DataTables column settings.
 *
 * Internal: not exported from the package. It is the only place that knows
 * DataTables' column names, so a DataTables change only touches this file.
 *
 * @param columns The user's columns.
 * @param withActions Adds the actions column at the end. It must stay last:
 *   the user's columns keep their positions, and Tadabut finds cells by
 *   position.
 */
export function toDataTables<Row extends object>(
  columns: readonly Column<Row>[],
  withActions: boolean,
): ColumnOptions[] {
  const converted = columns.map((column): ColumnOptions => {
    const label = labelOf(column as LooseColumn<Row>);

    return {
      title: column.title,
      data: column.prop,
      // DataTables asks for a cell's value for four jobs, by `type`:
      // 'display' (the cell), 'filter' (search), 'sort' and 'type'.
      render: (value: unknown, type: unknown, row: Row) => {
        switch (type) {
          case 'display':
            return escapeHtml(label(value, row));
          case 'filter':
            return label(value, row);
          default:
            return value;
        }
      },
    };
  });

  // A copy for each table, in case DataTables changes the object it gets.
  return withActions ? [...converted, { ...actionsColumn }] : converted;
}

/**
 * Picks how a column's value becomes text: its own `render`, else the label
 * of a fixed select list, else the value itself. Empty values give `''`.
 */
function labelOf<Row>(column: LooseColumn<Row>): (value: unknown, row: Row) => string {
  const { render, editor } = column;

  if (render !== undefined) {
    return render;
  }

  if (editor?.type === 'select' && typeof editor.options !== 'function') {
    const options = editor.options;

    return (value) => options.find((option) => option.value === value)?.label ?? asText(value);
  }

  return asText;
}

/** The value as text. `null` and `undefined` give an empty cell. */
function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}
