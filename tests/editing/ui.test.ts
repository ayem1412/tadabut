import { afterEach, describe, expect, it } from 'vitest';

import { type Column, type EditingOptions, Tadabut } from '../../src/index';

type Row = { id: number; name: string };

const rows: Row[] = [
  { id: 1, name: 'Amina' },
  { id: 2, name: 'Salma' },
];

const editable: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
];

function setup(columns: Column<Row>[] = editable, editing?: EditingOptions) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const table = new Tadabut(container, { data: rows, rowId: 'id', columns, editing });

  const headers = () => [...container.querySelectorAll('thead th')];
  const editButtons = () => [
    ...container.querySelectorAll<HTMLButtonElement>('tbody [data-tdb-action="edit"]'),
  ];

  return { container, table, headers, editButtons };
}

describe('the actions column', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds an empty column at the end', () => {
    const { headers } = setup();

    expect(headers().map((th) => th.textContent)).toEqual(['ID', 'Name', '']);
    expect(headers()[2]?.classList.contains('tdb-actions')).toBe(true);
  });

  it('puts an Edit button in each row', () => {
    const { editButtons } = setup();

    expect(editButtons()).toHaveLength(2);
    expect(editButtons()[0]?.textContent).toBe('Edit');
    expect(editButtons()[0]?.type).toBe('button');
    expect(editButtons()[0]?.className).toBe('tdb-button tdb-button-edit');
  });

  it('cannot be sorted', () => {
    const { headers, container } = setup();
    const firstName = () => container.querySelector('tbody td:nth-child(2)')?.textContent;

    (headers()[2] as HTMLElement).click();

    expect(firstName()).toBe('Amina');
    expect(headers()[2]?.classList.contains('dt-orderable-none')).toBe(true);
  });

  it('is not searched', () => {
    const { container } = setup();
    const search = container.querySelector('.dt-search input') as HTMLInputElement;

    search.value = 'Edit';
    search.dispatchEvent(new Event('input'));

    expect(container.querySelector('tbody td.dt-empty')).not.toBeNull();
  });

  it('is left out when button is false', () => {
    const { headers, editButtons } = setup(editable, { button: false });

    expect(headers()).toHaveLength(2);
    expect(editButtons()).toHaveLength(0);
  });

  it('is left out when no column has an editor', () => {
    const { headers } = setup([
      { title: 'ID', prop: 'id' },
      { title: 'Name', prop: 'name' },
    ]);

    expect(headers()).toHaveLength(2);
  });

  it('keeps editing the right cells', () => {
    const { table, container } = setup();
    table.edit(1);

    const cells = [...container.querySelectorAll('tbody tr:first-child td')];

    expect(cells[1]?.querySelector('input')?.value).toBe('Amina');
    expect(cells[2]?.querySelector('[data-tdb-action="edit"]')).not.toBeNull();
  });
});
