import type { Config } from 'datatables.net';
import type { Column } from '../columns/column';
import type { Texts } from '../texts/texts';
import type { RowScope } from './scope';

/** The second argument of `onSave`. */
export type SaveContext<Row extends object> = {
  /** The row as it was before editing. */
  readonly previous: Row;
};

/** How rows are edited. */
export type EditingOptions = {
  /**
   * `'single'` (default) allows one open row at a time. `'multiple'` allows
   * any number, each saved on its own.
   */
  readonly mode?: 'single' | 'multiple';
  /**
   * Adds an Edit/Save/Cancel column at the end. Defaults to `true`. Turn it
   * off if you open rows yourself with `edit()`. The Delete button still
   * shows if `onDelete` is set.
   */
  readonly button?: boolean;
  /**
   * Double-clicking a row opens it for editing. Defaults to `false`.
   * `onRowDoubleClick` still fires.
   */
  readonly doubleClick?: boolean;
};

/**
 * Extra CSS classes for the table and its buttons. They're added next to the
 * `tdb-` classes, not instead of them.
 *
 * @example
 * // Bootstrap 5
 * {
 *   table: 'table table-striped table-hover',
 *   button: 'btn btn-sm',
 *   edit: 'btn-outline-primary',
 *   save: 'btn-primary',
 *   cancel: 'btn-outline-secondary',
 *   delete: 'btn-outline-danger',
 *   confirm: 'btn-danger',
 *   keep: 'btn-outline-secondary',
 *   select: 'form-check-input',
 * }
 */
export type TableClassNames = {
  /** On the `<table>`. */
  readonly table?: string;
  /** Every button. */
  readonly button?: string;
  /** Edit button only. */
  readonly edit?: string;
  /** Save button only. */
  readonly save?: string;
  /** Cancel button only. */
  readonly cancel?: string;
  /** Delete button only. */
  readonly delete?: string;
  /** The button that confirms a delete. */
  readonly confirm?: string;
  /** The button that keeps the row instead. */
  readonly keep?: string;
  /** The selection checkboxes, header included. */
  readonly select?: string;
  /** The button that opens and closes a detail. */
  readonly detail?: string;
};

/**
 * Any {@link https://datatables.net/reference/option/ | DataTables option},
 * extensions included, except the ones Tadabut has to own: `data`,
 * `columns`, `columnDefs` (use the column options), and `ajax`/`serverSide`
 * (load rows yourself and call `setData`).
 *
 * @example
 * { order: [[1, 'asc']], pageLength: 20, language: { search: 'Rechercher :' } }
 */
export type DataTablesSettings = Omit<
  Config,
  'data' | 'columns' | 'columnDefs' | 'ajax' | 'serverSide'
>;

/** Options for `selection`. */
export type SelectionOptions = {
  /**
   * Which rows the header checkbox selects. Defaults to `'searched'`: every
   * row that matches the search, on every page.
   */
  readonly checkAll?: RowScope;
};

/** What `detail` returns: an element, or text. Text is shown as it is, never as HTML. */
export type DetailContent = Node | string;

/** The second argument of `detail`. */
export type DetailContext = {
  /** Aborted when the detail closes before it finished loading. Pass it to `fetch`. */
  readonly signal: AbortSignal;
};

/** Options for `new Tadabut()`. */
export type TadabutOptions<Row extends object> = {
  /** The rows. The array is copied, never changed. */
  readonly data: readonly Row[];
  /** The columns, in order. */
  readonly columns: readonly Column<Row>[];
  /**
   * The field that identifies a row, like `'id'`. Values must be unique.
   * Required as soon as a column has an `editor`.
   */
  readonly rowId?: keyof Row & string;
  /** How rows are edited. */
  readonly editing?: EditingOptions;
  /** Your classes for the table and buttons. */
  readonly classNames?: TableClassNames;
  /** DataTables' own options, passed through. */
  readonly dataTables?: DataTablesSettings;
  /**
   * Tadabut's own texts, like `fr`. Whatever you leave out stays in English.
   *
   * @example
   * texts: { ...fr, save: 'Valider' }
   */
  readonly texts?: Partial<Texts>;
  /**
   * Which rows the totals count: `'searched'` (default) is every row that
   * matches the search, on every page. `'all'` ignores the search. `'page'`
   * is only the rows shown.
   *
   * Does nothing unless a column has `total`.
   */
  readonly totalRows?: RowScope;
  /**
   * Adds a first column with a checkbox on each row, and one in the header to
   * check them all. `true` uses the defaults. Needs `rowId`.
   *
   * @example
   * selection: { checkAll: 'page' }
   */
  readonly selection?: boolean | SelectionOptions;
  /**
   * Called with the selected rows each time the selection changes, by a
   * click or from code.
   */
  readonly onSelect?: (rows: readonly Row[]) => void;
  /**
   * Adds a ▸ button at the start of each row. It opens a line under the row
   * with what this returns. May be async: "Loading…" shows while it waits,
   * and the error message if it throws. It runs again after the row is
   * saved. Needs `rowId`.
   *
   * @example
   * detail: async (row, { signal }) => {
   *   const res = await fetch(`/api/orders/${row.id}/lines`, { signal });
   *   const box = document.createElement('ul');
   *   for (const line of await res.json()) {
   *     box.append(Object.assign(document.createElement('li'), { textContent: line.label }));
   *   }
   *   return box;
   * }
   */
  readonly detail?: (row: Row, context: DetailContext) => DetailContent | Promise<DetailContent>;
  /**
   * Called with the edited row once it passes validation. May be async.
   *
   * Return a row to replace the edited one (useful for fields the server
   * sets, like `updatedAt`), or nothing to keep it. Throw to reject the
   * save: the row stays open and the error message is shown under it.
   */
  readonly onSave?: (
    row: Row,
    context: SaveContext<Row>,
    // biome-ignore lint/suspicious/noConfusingVoidType: callbacks that return nothing are typed void.
  ) => Row | void | Promise<Row | void>;
  /**
   * Called with a new row once it passes validation. May be async.
   *
   * Return the saved row, usually with its id from the server, or nothing
   * to keep the row as typed. Either way it must have its `rowId` field, or
   * Tadabut throws an error. Throw to reject the add: the row stays open and
   * the error message is shown under it.
   *
   * The row is partial because it isn't saved yet: the id, and columns
   * without an editor, are only there if you passed them to `add()`.
   *
   * @example
   * onAdd: async (row) => {
   *   const res = await fetch('/api/employees', { method: 'POST', body: JSON.stringify(row) });
   *   return res.json();
   * }
   */
  // biome-ignore lint/suspicious/noConfusingVoidType: callbacks that return nothing are typed void.
  readonly onAdd?: (row: Partial<Row>) => Row | void | Promise<Row | void>;
  /**
   * Called when a row is deleted. May be async. Throw to stop the delete:
   * the row stays and the error message is shown under it.
   *
   * The Delete button only shows when this is set.
   */
  readonly onDelete?: (row: Row) => void | Promise<void>;
  /**
   * What happens before a row is deleted with the Delete button. By default
   * the row asks "Delete this row?" with two buttons. `false` deletes right
   * away. A function replaces the question with yours: return `true` to
   * delete. May be async, for a modal.
   *
   * `delete()` from code never asks.
   *
   * @example
   * confirmDelete: (row) => window.confirm(`Delete ${row.name}?`)
   */
  readonly confirmDelete?: false | ((row: Row) => boolean | Promise<boolean>);
  /**
   * Called when a row opens for editing: by the Edit button, a double click,
   * or `edit()`. Return `false` to keep it closed; `edit()` then returns
   * `false`. Not called for the new row `add()` opens.
   *
   * @example
   * onEditStart: (row) => row.status !== 'validated'
   */
  // biome-ignore lint/suspicious/noConfusingVoidType: callbacks that return nothing are typed void.
  readonly onEditStart?: (row: Row) => boolean | void;
  /**
   * Called after a save worked and the row closed, with the row as it is now
   * in the table (what `onSave` returned, if anything) and the row before
   * editing.
   */
  readonly onSaved?: (row: Row, context: SaveContext<Row>) => void;
  /** Called after a new row joined the table, with the row as saved. */
  readonly onAdded?: (row: Row) => void;
  /** Called after a row left the table, with that row. */
  readonly onDeleted?: (row: Row) => void;
  /**
   * Called when a row is clicked. Clicks on buttons, inputs and checkboxes
   * don't count, and neither do clicks in a row being edited, the new row,
   * or an error line.
   */
  readonly onRowClick?: (row: Row, event: MouseEvent) => void;
  /**
   * Called when a row is double-clicked, with the same rules as
   * `onRowClick`. The browser fires two clicks first, so `onRowClick` runs
   * twice before it.
   */
  readonly onRowDoubleClick?: (row: Row, event: MouseEvent) => void;
};
