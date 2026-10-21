import DataTable, { type Api } from 'datatables.net';

export class Tadabut {
  private readonly dataTable: Api;
  private readonly tableEl: HTMLTableElement;

  public constructor(
    parentEl: HTMLElement,
    data: Record<string, unknown>[],
    columns: { title: string; prop: string }[],
  ) {
    this.tableEl = document.createElement('table');

    parentEl.appendChild(this.tableEl);
    this.dataTable = new DataTable(this.tableEl, {
      data,
      columns: columns.map(({ title, prop }) => ({ title, data: prop })),
    });
  }

  public destroy(): void {
    this.dataTable.destroy();
    this.tableEl.remove();
  }
}
