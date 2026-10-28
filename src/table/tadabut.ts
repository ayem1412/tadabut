import DataTable, { type Api, type ApiRowMethods } from 'datatables.net';
import type { Column } from '../columns/column';
import { toDataTables } from '../columns/to-datatables';
import { type EditableCell, EditSession } from '../editing/session';
import type { EditingOptions, TadabutOptions } from './options';

/**
 * A DataTables table, created and owned by Tadabut.
 *
 * @typeParam Row - The shape of one row. Usually worked out from `data`,
 *   so there is no need to write it.
 *
 * @example
 * const table = new Tadabut(container, {
 *   data: [{ id: 1, name: 'Amina' }],
 *   rowId: 'id',
 *   columns: [
 *     { title: 'ID', prop: 'id' },
 *     { title: 'Name', prop: 'name' },
 *   ],
 * });
 */
export class Tadabut<Row extends object> {
  private readonly dataTable: Api<Row>;
  private readonly tableEl: HTMLTableElement;
  private readonly rowId: (keyof Row & string) | undefined;
  private readonly columns: readonly Column<Row>[];
  /** The `editing` option, with its defaults filled in. */
  private readonly editing: Required<EditingOptions>;
  private readonly onSave: TadabutOptions<Row>['onSave'];
  /** The rows being edited, by row id. */
  private readonly sessions: Map<string | number, EditSession<Row>> = new Map();

  /**
   * Creates a table inside `container`.
   *
   * @param container An empty element. Tadabut adds the table to it, and
   *   `destroy()` leaves it empty again.
   * @param options The data and columns to show.
   * @throws If a column has an `editor` but `rowId` is missing. Editing
   *   needs `rowId` to find rows.
   */
  public constructor(container: HTMLElement, options: TadabutOptions<Row>) {
    const hasEditor = options.columns.some((column) => column.editor !== undefined);

    if (hasEditor && options.rowId === undefined) {
      throw new Error('Tadabut: rowId is required when a column has an editor.');
    }

    this.rowId = options.rowId;
    this.columns = options.columns;
    this.editing = {
      mode: options.editing?.mode ?? 'single',
      button: options.editing?.button ?? true,
    };
    this.onSave = options.onSave;

    this.tableEl = document.createElement('table');
    container.appendChild(this.tableEl);

    this.dataTable = new DataTable(this.tableEl, {
      // Copy, so DataTables never holds or changes the caller's array.
      data: [...options.data],
      columns: toDataTables(options.columns, hasEditor && this.editing.button),
    });
  }

  /**
   * Replaces all rows without rebuilding the table.
   *
   * Sorting, search and the current page are kept. If the current page no
   * longer exists (fewer rows than before), DataTables shows the last one.
   *
   * Any row being edited is cancelled first. Unsaved changes are lost.
   *
   * @param rows The new rows. The array is copied, never changed.
   */
  public setData(rows: readonly Row[]): void {
    this.destroySessions();

    this.dataTable
      .clear()
      .rows.add([...rows])
      .draw(false);
  }

  /**
   * Starts editing a row: its editable cells are replaced by editors showing
   * the row's values.
   *
   * In `'single'` mode (the default), only one row can be open at a time.
   * In `'multiple'` mode, any number can.
   *
   * @param id The row's id: the value of its `rowId` field.
   * @returns `true` if editing started. `false` if the row doesn't exist,
   *   it's already open, another row is open in `'single'` mode, no column
   *   is editable, or the row is on a page that hasn't been shown yet.
   */
  public edit(id: string | number): boolean {
    if (this.sessions.has(id)) {
      return false;
    }

    if (this.editing.mode === 'single' && this.sessions.size > 0) {
      return false;
    }

    const row = this.findRow(id);

    if (row === undefined) {
      return false;
    }

    // DataTables only creates a row's HTML once the row is shown. A row on
    // a page nobody has opened yet has no cells to put editors in.
    if (row.node() === null) {
      return false;
    }

    const rowIndex = row.index();
    const cells: EditableCell<Row>[] = [];

    this.columns.forEach((column, columnIndex) => {
      if (column.editor !== undefined) {
        const cell = this.dataTable.cell(rowIndex, columnIndex).node();
        cells.push({ column, cell: cell as HTMLTableCellElement });
      }
    });

    this.sessions.set(id, new EditSession(row.data(), cells));
    return true;
  }

  /**
   * Stops editing a row and puts its original values back. Unsaved changes
   * are lost. Does nothing if the row isn't being edited.
   *
   * @param id The row's id: the value of its `rowId` field.
   */
  public cancel(id: string | number): void {
    const session = this.sessions.get(id);

    if (session === undefined) {
      return;
    }

    if (session.saving) {
      return;
    }

    session.destroy();
    this.sessions.delete(id);

    this.clearSaveError(id);

    // 'data': the row's data is right, rebuild its cells from it. Without
    // it, DataTables could read the now empty cells back into the data.
    this.findRow(id)?.invalidate('data').draw(false);
  }

  /**
   * Tells whether a row is being edited.
   *
   * @param id The row's id: the value of its `rowId` field.
   */
  public isEditing(id: string | number): boolean {
    return this.sessions.has(id);
  }

  /**
   * Validates and saves the row being edited.
   *
   * 1. Every field is validated. If one fails, its error shows under its
   *    input, the cursor goes to the first wrong field, and `onSave` isn't
   *    called.
   * 2. The row is locked while `onSave` runs.
   * 3. If `onSave` works, the row closes and shows the new values: the row
   *    `onSave` returned, or else the edited row.
   * 4. If `onSave` throws, the row stays open with what the user typed, and
   *    the error's message shows under the row.
   *
   * The table's data only changes when saving works.
   *
   * @param id The row's id: the value of its `rowId` field.
   * @returns `true` if the row was saved and closed. `false` if a field is
   *   invalid, `onSave` failed, the row isn't being edited, it's already
   *   saving, or editing was stopped (by `setData` or `destroy`) while
   *   `onSave` was running.
   */
  public async save(id: string | number): Promise<boolean> {
    const session = this.sessions.get(id);

    if (session === undefined || session.saving) {
      return false;
    }

    session.clearErrors();
    this.clearSaveError(id);

    const errors = session.validate();
    const [firstInvalid] = errors.keys();

    if (firstInvalid !== undefined) {
      session.showErrors(errors);
      session.focus(firstInvalid);
      return false;
    }

    const row = session.getRow();
    this.setSaving(id, true);

    let saved = row;

    try {
      const result = await this.onSave?.(row, {
        previous: session.originalData,
      });

      if (result !== undefined) {
        saved = result;
      }
    } catch (error) {
      if (this.sessions.get(id) !== session) {
        return false;
      }

      this.setSaving(id, false);
      this.showSaveError(id, error instanceof Error ? error.message : 'Could not save.');
      return false;
    }

    // While onSave ran, setData or destroy may have closed this session.
    // Then the row may be gone, or belong to a new session: leave it alone.
    if (this.sessions.get(id) !== session) {
      return false;
    }

    session.destroy();
    this.sessions.delete(id);

    // Copy, so DataTables never holds the user's own object. Setting the
    // data also rebuilds the row's cells.
    this.findRow(id)
      ?.data({ ...saved })
      .draw(false);
    this.setSaving(id, false);

    return true;
  }

  /**
   * Removes the table and everything Tadabut added to the container.
   * Any row being edited is cancelled first.
   */
  public destroy(): void {
    this.destroySessions();
    this.dataTable.destroy();
    this.tableEl.remove();
  }

  /**
   * Finds a row by its id. `undefined` if there is no `rowId` option, or no
   * row with that id.
   */
  private findRow(id: string | number): ApiRowMethods<Row> | undefined {
    const rowId = this.rowId;

    if (rowId === undefined) {
      return undefined;
    }

    const row = this.dataTable.row((_index, data) => data[rowId] === id);

    return row.any() ? row : undefined;
  }

  /**
   * Destroys every open editor, without putting the cells' content back.
   * Used right before the rows or the whole table go away.
   */
  private destroySessions(): void {
    for (const session of this.sessions.values()) {
      session.destroy();
    }

    this.sessions.clear();
  }

  /**
   * Locks or unlocks a row while it's being saved: sets the session's
   * `saving` flag, and `inert` and the `tdb-row-saving` class on the row.
   *
   * Works even when the session is already gone, so a row can always be
   * unlocked after saving.
   */
  private setSaving(id: string | number, saving: boolean): void {
    const session = this.sessions.get(id);

    if (session !== undefined) {
      session.saving = saving;
    }

    const tr = this.findRow(id)?.node();

    if (tr) {
      tr.inert = saving;
      tr.classList.toggle('tdb-row-saving', saving);
    }
  }

  /**
   * Shows a save error on its own line under the row, with the
   * `tdb-save-error` class.
   *
   * The message is set as text, never as HTML: it often comes from a server,
   * and HTML in it could run code in the page.
   */
  private showSaveError(id: string | number, message: string): void {
    const error = document.createElement('div');
    error.textContent = message;

    this.findRow(id)?.child(error, 'tdb-save-error').show();
  }

  /** Removes the save error under a row, if there is one. */
  private clearSaveError(id: string | number): void {
    this.findRow(id)?.child.remove();
  }
}
