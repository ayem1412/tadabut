import { describe, expect, it } from 'vitest';

import { type Column, html, Tadabut } from '../../src/index';
import { mountPoint, search } from '../helpers';

type Row = { id: number; status: string; color: string; amount: number };

const rows: Row[] = [
  { id: 1, status: 'Paid', color: 'green', amount: 100 },
  { id: 2, status: '<img src=x onerror=alert(1)>', color: 'red', amount: 50 },
];

function setup(columns: Column<Row>[]) {
  const container = mountPoint();
  const table = new Tadabut(container, {
    data: rows,
    rowId: 'id',
    columns,
    dataTables: { order: [] },
  });

  const cell = (row: number, column: number) =>
    container.querySelectorAll('tbody tr')[row]?.querySelectorAll('td')[column] as HTMLElement;

  return { container, table, cell };
}

const badge: Column<Row> = {
  title: 'Status',
  prop: 'status',
  render: (value, row) => html`<span class="badge bg-${row.color}">${value}</span>`,
};

describe('elements in cells', () => {
  it('puts the element in the cell', () => {
    const { cell } = setup([{ title: 'ID', prop: 'id' }, badge]);

    expect(cell(0, 1).innerHTML).toBe('<span class="badge bg-green">Paid</span>');
  });

  it('still shows text from the server as text', () => {
    const { cell } = setup([{ title: 'ID', prop: 'id' }, badge]);

    expect(cell(1, 1).querySelector('img')).toBeNull();
    expect(cell(1, 1).textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('keeps text from render as text, like before', () => {
    const { cell } = setup([
      { title: 'Status', prop: 'status', render: (value) => `<b>${value}</b>` },
    ]);

    expect(cell(0, 0).querySelector('b')).toBeNull();
    expect(cell(0, 0).textContent).toBe('<b>Paid</b>');
  });

  it('searches the visible text, and the raw value', () => {
    const { container, table } = setup([
      { title: 'ID', prop: 'id' },
      { title: 'Amount', prop: 'amount', render: (value) => html`<b>${value} MAD</b>` },
    ]);

    search(container, 'MAD');

    expect(table.getData('searched')).toHaveLength(2);

    search(container, 'span');

    expect(table.getData('searched')).toHaveLength(0);
  });

  it('draws the element again after an edit is cancelled', () => {
    const { table, cell } = setup([{ title: 'ID', prop: 'id', editor: { type: 'number' } }, badge]);

    table.edit(1);
    table.cancel(1);

    expect(cell(0, 1).querySelector('span.badge')?.textContent).toBe('Paid');
  });

  it('puts an element in the footer too', () => {
    const { container } = setup([
      { title: 'ID', prop: 'id' },
      {
        title: 'Amount',
        prop: 'amount',
        total: 'sum',
        render: (value) => html`<strong>${value}</strong>`,
      },
    ]);

    expect(container.querySelector('tfoot strong')?.textContent).toBe('150');
  });
});
