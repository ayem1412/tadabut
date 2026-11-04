import type { Config } from 'datatables.net';
import type { Column } from '../columns/column';

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
   * off if you open rows yourself with `edit()`.
   */
  readonly button?: boolean;
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
 * }
 */
export type TableClassNames = {
  /** On the `<table>`. */
  readonly table?: string;
  /** All three buttons. */
  readonly button?: string;
  /** Edit button only. */
  readonly edit?: string;
  /** Save button only. */
  readonly save?: string;
  /** Cancel button only. */
  readonly cancel?: string;
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
};
