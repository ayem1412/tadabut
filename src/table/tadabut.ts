import DataTable, { type Api } from 'datatables.net';

import { toDataTables } from '../columns/to-datatables';
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

  /**
   * Creates a table inside `container`.
   *
   * @param container An empty element. Tadabut adds the table to it, and `destroy()` leaves it empty again.
   * @param options The data and columns to show.
   *
   * @throws If a column has an `editor` but `rowId` is missing. Editing needs `rowId` to find rows.
   */
  public constructor(container: HTMLElement, options: TadabutOptions<Row>) {
    const hasEditor = options.columns.some((column) => column.editor !== undefined);
    if (hasEditor && options.rowId === undefined) {
      throw new Error('Tadabut: rowId is required when a column has an editor.');
    }

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
   * Removes the table and everything Tadabut added to the container.
   */
  public destroy(): void {
    this.dataTable.destroy();
    this.tableEl.remove();
  }
}
