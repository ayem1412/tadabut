import type { ColumnOptions } from 'datatables.net';

import type { Column } from './column';

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
  const converted: ColumnOptions[] = columns.map(({ title, prop }) => ({ title, data: prop }));

  // A copy for each table, in case DataTables changes the object it gets.
  return withActions ? [...converted, { ...actionsColumn }] : converted;
}
