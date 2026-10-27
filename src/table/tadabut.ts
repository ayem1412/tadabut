import DataTable, { type Api, type ApiRowMethods } from 'datatables.net';
import type { Column } from '../columns/column';
import { toDataTables } from '../columns/to-datatables';
import { type EditableCell, EditSession } from '../editing/session';
import type { TadabutOptions } from './options';

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

    this.tableEl = document.createElement('table');
    container.appendChild(this.tableEl);

    this.dataTable = new DataTable(this.tableEl, {
      // Copy, so DataTables never holds or changes the caller's array.
      data: [...options.data],
      columns: toDataTables(options.columns),
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
   * Only one row can be edited at a time for now.
   *
   * @param id The row's id: the value of its `rowId` field.
   * @returns `true` if editing started. `false` if the row doesn't exist,
   *   another row is open (including this one), no column is editable, or
   *   the row is on a page that hasn't been shown yet.
   */
  public edit(id: string | number): boolean {
    if (this.sessions.size > 0) {
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

    session.destroy();
    this.sessions.delete(id);

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
}
