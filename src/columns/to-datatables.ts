import type { ColumnOptions } from 'datatables.net';

import { splitClasses } from '../editors/classes';
import type { AnyEditor } from '../editors/editor';
import type { TableClassNames } from '../table/options';
import type { Texts } from '../texts/texts';
import type { Column } from './column';
import { escapeHtml } from './escape';

/** The Edit button column. Save and Cancel replace the button while a row is open. */
function actionsColumn(classNames: TableClassNames, label: string): ColumnOptions {
  const classes = [
    'tdb-button',
    'tdb-button-edit',
    ...splitClasses(classNames.button, classNames.edit),
  ].join(' ');

  return {
    title: '',
    data: null,
    className: 'tdb-actions',
    orderable: false,
    searchable: false,
    // defaultContent is HTML, so the classes and the label are escaped.
    defaultContent: `<button type="button" class="${escapeHtml(classes)}" data-tdb-action="edit">${escapeHtml(label)}</button>`,
  };
}

/** `Column<Row>` is a union per field, which makes `render` uncallable here. */
type LooseColumn<Row> = {
  /** The column's `render`, with its value type erased. */
  readonly render?: (value: unknown, row: Row) => string;
  /** The column's editor config. */
  readonly editor?: AnyEditor;
};

/**
 * The actions column is always appended last, because the rest of Tadabut
 * finds cells by the user's column index.
 */
export function toDataTables<Row extends object>(
  columns: readonly Column<Row>[],
  withActions: boolean,
  classNames: TableClassNames,
  texts: Texts,
): ColumnOptions[] {
  const converted = columns.map((column): ColumnOptions => {
    const label = labelOf(column as LooseColumn<Row>);

    return {
      // Passing `width: undefined` would wipe DataTables' default.
      ...defined({
        width: column.width,
        visible: column.visible,
        orderable: column.orderable,
        searchable: column.searchable,
        className: column.className,
      }),
      title: column.title,
      data: column.prop,
      render: (value: unknown, type: unknown, row: Row) => {
        switch (type) {
          case 'display':
            return escapeHtml(label(value, row));

          case 'filter':
            return label(value, row);

          default:
            // sort and type: keep numbers as numbers
            return value;
        }
      },
    };
  });

  return withActions ? [...converted, actionsColumn(classNames, texts.edit)] : converted;
}

/** `render`, then `labelProp`, then a fixed list's label, then the value. */
function labelOf<Row>(column: LooseColumn<Row>): (value: unknown, row: Row) => string {
  const { render, editor } = column;

  if (render !== undefined) {
    return render;
  }

  if (editor?.type === 'select') {
    const labelProp = editor.labelProp;

    if (labelProp !== undefined) {
      return (_value, row) => asText((row as Record<string, unknown>)[labelProp]);
    }

    if (typeof editor.options !== 'function') {
      const options = editor.options;

      return (value) => options.find((option) => option.value === value)?.label ?? asText(value);
    }
  }

  return asText;
}

/** `null` and `undefined` become an empty cell. */
function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/** Drops the keys whose value is `undefined`. */
function defined<T extends object>(values: T): Partial<T> {
  const kept = Object.entries(values).filter(([, value]) => value !== undefined);

  return Object.fromEntries(kept) as Partial<T>;
}
