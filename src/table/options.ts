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
