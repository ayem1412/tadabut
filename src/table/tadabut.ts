import DataTable, { type Api } from 'datatables.net';
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
   * @param rows The new rows. The array is copied, never changed.
   */
  public setData(rows: readonly Row[]): void {
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
    const rowId = this.rowId;

    if (rowId === undefined || this.sessions.size > 0) {
      return false;
    }

    const row = this.dataTable.row((_index, data) => data[rowId] === id);

    if (!row.any()) {
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
   * Removes the table and everything Tadabut added to the container.
   */
  public destroy(): void {
    this.dataTable.destroy();
    this.tableEl.remove();
  }
}
