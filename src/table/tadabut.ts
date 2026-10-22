import DataTable, { type Api } from 'datatables.net';

import { toDataTables } from '../columns/to-datatables';
import type { TadabutOptions } from './options';

/**
 * A DataTables table, created and owned by Tadabut.
 *
 * @example
 * const table = new Tadabut(container, {
 *   data: [{ id: 1, name: 'Amina' }],
 *   columns: [
 *     { title: 'ID', prop: 'id' },
 *     { title: 'Name', prop: 'name' },
 *   ],
 * });
 */
export class Tadabut {
  private readonly dataTable: Api;
  private readonly tableEl: HTMLTableElement;

  /**
   * Creates a table inside `container`.
   *
   * @param container An empty element. Tadabut adds the table to it, and
   *   `destroy()` leaves it empty again.
   * @param options The data and columns to show.
   */
  public constructor(container: HTMLElement, options: TadabutOptions) {
    this.tableEl = document.createElement('table');
    container.appendChild(this.tableEl);

    this.dataTable = new DataTable(this.tableEl, {
      // Copy, so DataTables never holds or changes the caller's array.
      data: [...options.data],
      columns: toDataTables(options.columns),
    });
  }

  /**
   * Removes the table and everything Tadabut added to the container.
   */
  public destroy(): void {
    this.dataTable.destroy();
    this.tableEl.remove();
  }
}
