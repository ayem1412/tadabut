import type { ColumnOptions } from 'datatables.net';

import { splitClasses } from '../editors/classes';
import { defaultDateFormat, formatDate, parseDate } from '../editors/date-format';
import type { AnyEditor } from '../editors/editor';
import { moneyFormat } from '../editors/money';
import { formatMoney } from '../editors/money-format';
import { type Action, buttonHtml, selectAllHtml, selectRowHtml } from '../table/elements';
import type { TableClassNames } from '../table/options';
import type { Texts } from '../texts/texts';
import type { Column } from './column';
import { escapeHtml } from './escape';

/**
 * The column with the Edit and Delete buttons. While a row is open, Save and
 * Cancel replace them.
 */
function actionsColumn(
  actions: readonly Action[],
  classNames: TableClassNames,
  texts: Texts,
): ColumnOptions {
  const buttons = actions.map((action) =>
    buttonHtml(action, texts[action], splitClasses(classNames.button, classNames[action])),
  );

  return {
    title: '',
    data: null,
    className: 'tdb-actions',
    orderable: false,
    searchable: false,
    defaultContent: buttons.join(''),
  };
}

/**
 * The checkbox column. The checkboxes are the same HTML on every row; which
 * ones are ticked is set after each draw.
 */
function selectColumn(classNames: TableClassNames, texts: Texts): ColumnOptions {
  return {
    title: selectAllHtml(texts, classNames),
    data: null,
    className: 'tdb-select',
    orderable: false,
    searchable: false,
    defaultContent: selectRowHtml(texts, classNames),
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
 * The checkbox column goes first with `selection`, and the actions column
 * last. Tadabut shifts your column indexes to match. No `actions` means no
 * actions column.
 */
export function toDataTables<Row extends object>(
  columns: readonly Column<Row>[],
  actions: readonly Action[],
  classNames: TableClassNames,
  texts: Texts,
  selection: boolean,
): ColumnOptions[] {
  const converted = columns.map((column): ColumnOptions => {
    const label = labelOf(column as LooseColumn<Row>);
    const sortValue = sortValueOf(column as LooseColumn<Row>);

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
      // A row without this field (an added row, an optional field) is an empty
      // cell. Without it, DataTables shows an alert() box.
      defaultContent: '',
      render: (value: unknown, type: unknown, row: Row) => {
        switch (type) {
          case 'display':
            return escapeHtml(label(value, row));

          case 'filter':
            // Both, so searching "12500" finds "12 500.00".
            return `${label(value, row)} ${asText(value)}`;

          default:
            // sort and type: dates as ISO, numbers as numbers
            return sortValue(value);
        }
      },
    };
  });

  const first = selection ? [selectColumn(classNames, texts)] : [];
  const last = actions.length > 0 ? [actionsColumn(actions, classNames, texts)] : [];

  return [...first, ...converted, ...last];
}

/**
 * `render`, then a money or date format, then `labelProp`, then a fixed
 * list's label, then the value. A date that isn't valid shows as it is.
 */
function labelOf<Row>(column: LooseColumn<Row>): (value: unknown, row: Row) => string {
  const { render, editor } = column;

  if (render !== undefined) {
    return render;
  }

  switch (editor?.type) {
    case 'money': {
      const format = moneyFormat(editor);

      return (value) => (typeof value === 'number' ? formatMoney(value, format) : asText(value));
    }
    case 'date': {
      const format = editor.format ?? defaultDateFormat;
      const display = editor.display ?? format;

      return (value) => {
        if (typeof value !== 'string') {
          return asText(value);
        }

        const iso = parseDate(value, format);

        if (iso === null) {
          return asText(value);
        }

        return formatDate(iso, display);
      };
    }
    case 'select': {
      const labelProp = editor.labelProp;

      if (labelProp !== undefined) {
        return (_value, row) => asText((row as Record<string, unknown>)[labelProp]);
      }

      if (typeof editor.options !== 'function') {
        const options = editor.options;

        return (value) => options.find((option) => option.value === value)?.label ?? asText(value);
      }
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

/**
 * What DataTables sorts by. Dates become `'yyyy-mm-dd'`, so `'05/01/2024'`
 * sorts as January; invalid and empty dates give `''`, which sorts first.
 * Anything else stays as it is: numbers stay numbers.
 */
function sortValueOf<Row>(column: LooseColumn<Row>): (value: unknown) => unknown {
  const editor = column.editor;

  if (editor?.type === 'date') {
    const format = editor.format ?? defaultDateFormat;

    return (value) => (typeof value === 'string' ? (parseDate(value, format) ?? '') : '');
  }

  return (value) => value;
}
