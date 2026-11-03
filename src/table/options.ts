import type { Config } from 'datatables.net';
import type { Column } from '../columns/column';

/**
 * Extra information `onSave` gets next to the edited row.
 *
 * @typeParam Row - The shape of one row.
 */
export type SaveContext<Row extends object> = {
  /** The row as it was when editing started. */
  readonly previous: Row;
};

/**
 * How rows are edited.
 */
export type EditingOptions = {
  /**
   * How many rows can be edited at once.
   *
   * - `'single'` (default): one row. `edit` returns `false` while another
   *   row is open.
   * - `'multiple'`: any number of rows. Each one is saved or cancelled on
   *   its own.
   */
  readonly mode?: 'single' | 'multiple';
  /**
   * Adds a column at the end with Edit, Save and Cancel buttons.
   * Default `true`. Turn it off to start editing from your own code with
   * `edit`, `save` and `cancel`.
   */
  readonly button?: boolean;
};

/**
 * Your own CSS classes for the table and its buttons, like Bootstrap's or
 * Tailwind's.
 *
 * They are added next to the `tdb-` classes, never instead of them, so CSS
 * that targets `tdb-` classes keeps working.
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
  /** Added to the `<table>`. */
  readonly table?: string;
  /** Added to the Edit, Save and Cancel buttons. */
  readonly button?: string;
  /** Added to the Edit button only. */
  readonly edit?: string;
  /** Added to the Save button only. */
  readonly save?: string;
  /** Added to the Cancel button only. */
  readonly cancel?: string;
};

/**
 * DataTables' own settings, like `paging`, `pageLength`, `order` or
 * `language`, passed to DataTables as they are. Settings from DataTables
 * extensions, like Buttons, work too.
 *
 * All of DataTables' settings are allowed except these, which Tadabut needs
 * to control itself:
 * - `data` and `columns`: Tadabut makes them from its own `data` and
 *   `columns`.
 * - `columnDefs`: it would change columns behind Tadabut's back. Use the
 *   column options instead (`width`, `visible`, …).
 * - `ajax` and `serverSide`: DataTables would load and replace the rows by
 *   itself, without Tadabut knowing.
 *
 * See {@link https://datatables.net/reference/option/ | DataTables' options}.
 *
 * @example
 * {
 *   order: [[1, 'asc']],
 *   pageLength: 20,
 *   language: { search: 'Rechercher :' },
 * }
 */
export type DataTablesSettings = Omit<
  Config,
  'data' | 'columns' | 'columnDefs' | 'ajax' | 'serverSide'
>;

/**
 * Options for creating a Tadabut table.
 *
 * @typeParam Row - The shape of one row. Usually worked out from `data`.
 */
export type TadabutOptions<Row extends object> = {
  /** The rows to show. One object per row. */
  readonly data: readonly Row[];
  /** The columns to show, in order. */
  readonly columns: readonly Column<Row>[];
  /**
   * Name of the row property that identifies each row, like `'id'`.
   * Its values must be unique strings or numbers.
   *
   * Required when a column has an `editor`: editing uses it to find rows.
   */
  readonly rowId?: keyof Row & string;
  /** How rows are edited. Only used when a column has an `editor`. */
  readonly editing?: EditingOptions;
  /** Your CSS classes for the table and the buttons, like Bootstrap's. */
  readonly classNames?: TableClassNames;
  /**
   * DataTables' own settings, passed as they are. Tadabut's own options win
   * when both set the same thing.
   */
  readonly dataTables?: DataTablesSettings;
  /**
   * Called when a row is saved, after every field passed validation.
   * It can be async.
   *
   * - Return nothing to keep the edited row, or return a row to use that
   *   one instead (for fields the server fills in, like `updatedAt`).
   * - Throw to say saving failed. The row stays open with what the user
   *   typed, and the error's message shows under it.
   *
   * Without `onSave`, saving just updates the table.
   */
  readonly onSave?: (
    row: Row,
    context: SaveContext<Row>,
    // biome-ignore lint/suspicious/noConfusingVoidType: a callback that returns nothing has the type void, so void must be allowed here.
  ) => Row | void | Promise<Row | void>;
};
