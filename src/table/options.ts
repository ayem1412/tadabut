import type { Config } from 'datatables.net';
import type { Column } from '../columns/column';
import type { Texts } from '../texts/texts';
import type { RowScope, TotalScope } from './scope';

/** What `server` gets: which rows to send back. */
export type ServerRequest<Row extends object> = {
  /** The index of the page's first row, from 0. */
  readonly start: number;
  /** How many rows the page shows. `-1` means all of them. */
  readonly length: number;
  /** How to sort, most important first. Empty when the table isn't sorted. */
  readonly order: readonly {
    /** The field of the column. */
    readonly prop: keyof Row & string;
    /** `'asc'` or `'desc'`. */
    readonly dir: 'asc' | 'desc';
  }[];
  /** What's in the search box. `''` when it's empty. */
  readonly search: string;
};

/** What `server` returns. */
export type ServerResponse<Row extends object> = {
  /** The rows of the page. */
  readonly rows: readonly Row[];
  /** How many rows match the search, on every page. It gives the number of pages. */
  readonly count: number;
  /** How many rows there are before the search, for "(filtered from …)". Defaults to `count`. */
  readonly countAll?: number;
  /**
   * The footer's totals, by field, for the columns with a `total`. The
   * browser only has one page, so it can't count them. Formatted like the
   * cells.
   */
  readonly totals?: Partial<Record<keyof Row & string, number>>;
};

/**
 * Loads one page of rows. `signal` is aborted when a newer request replaces
 * this one: pass it to `fetch`. Throw to show the error above the table.
 */
export type ServerFunction<Row extends object> = (
  request: ServerRequest<Row>,
  context: {
    /** Aborted when this request isn't needed anymore. */
    readonly signal: AbortSignal;
  },
) => Promise<ServerResponse<Row>>;

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
 *   current: 'table-active',
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
  /** On the highlighted row, with `currentRow`. */
  readonly current?: string;
};

/**
 * Icon classes, one per button, named like its text. The button then shows
 * only the icon, and its text goes to `aria-label` and `title` (the tooltip).
 * A button you leave out keeps its text. Class names only, never HTML.
 *
 * @example
 * // FontAwesome
 * { edit: 'fa fa-pencil', delete: 'fa fa-trash', save: 'fa fa-check', cancel: 'fa fa-times' }
 */
export type ButtonIcons = {
  /** Edit button. */
  readonly edit?: string;
  /** Delete button. */
  readonly delete?: string;
  /** Save button. */
  readonly save?: string;
  /** Cancel button. */
  readonly cancel?: string;
  /** The button that confirms a delete. */
  readonly confirm?: string;
  /** The button that keeps the row instead. */
  readonly keep?: string;
  /** The ▸ button while the detail is closed. */
  readonly showDetail?: string;
  /** The ▾ button while the detail is open. */
  readonly hideDetail?: string;
};

/**
 * Any {@link https://datatables.net/reference/option/ | DataTables option},
 * extensions included, except the ones Tadabut has to own: `data`,
 * `columns`, `columnDefs` (use the column options), and `ajax`/`serverSide`
 * (use the `server` option).
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
   * row that matches the search, on every page. Always `'page'` with
   * `server`, where only the page is loaded.
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
  /** The rows. The array is copied, never changed. Leave it out with `server`. */
  readonly data?: readonly Row[];
  /**
   * Loads the rows one page at a time from your server, for tables too big
   * to load at once. Paging, sorting and search ask it again. Can't go with
   * `data`, and `setData`, `insertRow` and `removeRow` throw with it: use
   * `reload()`.
   *
   * Changing page, sorting or searching closes open rows, like `setData`.
   * Totals come from the server, except with `totalRows: 'selected'`.
   *
   * @example
   * server: async ({ start, length, order, search }, { signal }) => {
   *   const params = new URLSearchParams({ start: String(start), length: String(length), search });
   *   const res = await fetch(`/api/employees?${params}`, { signal });
   *   const { rows, count } = await res.json();
   *   return { rows, count };
   * }
   */
  readonly server?: ServerFunction<Row>;
  /** The columns, in order. */
  readonly columns: readonly Column<Row>[];
  /**
   * The field that identifies a row, like `'id'`. Values must be unique.
   * Required as soon as a column has an `editor`.
   */
  readonly rowId?: keyof Row & string;
  /** How rows are edited. */
  readonly editing?: EditingOptions;
  /**
   * `false` starts the table read-only: nothing can be edited, added or
   * deleted, and the buttons column is hidden. Defaults to `true`. Change it
   * later with `setEditable`.
   */
  readonly editable?: boolean;
  /**
   * Opens the new row by itself: once the table is built, after each
   * `setData` (or each load with `server`), after each add, and after
   * `setEditable(true)`. An object gives
   * it starting values, like `add()`. After Cancel it stays closed until the
   * next `setData`.
   *
   * When it opens by itself the cursor doesn't move, except right after an
   * add. In `'single'` mode it makes way for Edit, and comes back after.
   *
   * @example
   * autoAdd: { country: 'MA' }
   */
  readonly autoAdd?: boolean | Partial<Row>;
  /** Your classes for the table and buttons. */
  readonly classNames?: TableClassNames;
  /**
   * Icons instead of text on the buttons.
   *
   * @example
   * icons: { edit: 'fa fa-pencil', delete: 'fa fa-trash' }
   */
  readonly icons?: ButtonIcons;
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
   * is only the rows shown. `'selected'` is only the ticked rows, even ones
   * the search hides or on other pages: it needs `selection`.
   *
   * With `server`, the server sends the totals, so only `'selected'` counts here.
   *
   * Does nothing unless a column has `total`.
   */
  readonly totalRows?: TotalScope;
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
   * Clicking a row highlights it, one row at a time. Clicking it again
   * removes the highlight. The same clicks count as for `onRowClick`. The
   * row gets the `tdb-row-current` class and `classNames.current`. Needs
   * `rowId`.
   */
  readonly currentRow?: boolean;
  /**
   * Called each time the highlight moves, by a click or from code, with the
   * highlighted row. `null` when no row is highlighted anymore, also when it
   * left the table.
   */
  readonly onCurrentChange?: (row: Row | null) => void;
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
