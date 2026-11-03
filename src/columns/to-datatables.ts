import type { ColumnOptions } from 'datatables.net';

import { splitClasses } from '../editors/classes';
import type { AnyEditor } from '../editors/editor';
import type { TableClassNames } from '../table/options';
import type { Column } from './column';
import { escapeHtml } from './escape';

/**
 * The last column, with the Edit button. When a row is being edited, its
 * cell holds Save and Cancel instead.
 *
 * DataTables wants the button as an HTML string. The user's classes go
 * inside that string, so they are escaped: a class like `x" onclick="…`
 * stays a (strange) class, and can't close the attribute and add code.
 */
function actionsColumn(classNames: TableClassNames): ColumnOptions {
  const classes = [
    'tdb-button',
    'tdb-button-edit',
    ...splitClasses(classNames.button, classNames.edit),
  ].join(' ');

  return {
    title: '',
    data: null,
    className: 'tdb-actions',
    // Nobody sorts by buttons, and searching "Edit" shouldn't match every row.
    orderable: false,
    searchable: false,
    defaultContent: `<button type="button" class="${escapeHtml(classes)}" data-tdb-action="edit">Edit</button>`,
  };
}

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
 * @param classNames The user's classes. Only the Edit button uses them here.
 */
export function toDataTables<Row extends object>(
  columns: readonly Column<Row>[],
  withActions: boolean,
  classNames: TableClassNames,
): ColumnOptions[] {
  const converted = columns.map((column): ColumnOptions => {
    // Safe: `Column<Row>` already checked that `render` and `editor` fit the
    // column's value.
    const label = labelOf(column as LooseColumn<Row>);

    return {
      title: column.title,
      data: column.prop,
      // DataTables asks for a cell's value for four jobs, by `type`:
      // 'display' (the cell), 'filter' (search), 'sort' and 'type'.
      render: (value: unknown, type: unknown, row: Row) => {
        switch (type) {
          case 'display':
            // Put in the cell as HTML by DataTables: escape it.
            return escapeHtml(label(value, row));

          case 'filter':
            // Only searched, never put in the page: no need to escape.
            return label(value, row);

          default:
            // Sorting uses the real value, so 200 comes before 1000.
            return value;
        }
      },
    };
  });

  // A new object on each call, so tables never share it.
  return withActions ? [...converted, actionsColumn(classNames)] : converted;
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
