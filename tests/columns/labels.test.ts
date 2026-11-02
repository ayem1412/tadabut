import { afterEach, describe, expect, it } from 'vitest';

import { type Column, Tadabut } from '../../src/index';

type Row = { id: number; countryId: number | null; salary: number; note: string };

const rows: Row[] = [
  { id: 1, countryId: 1, salary: 1000, note: '<b>bold</b>' },
  { id: 2, countryId: 2, salary: 200, note: 'Tom & Jerry' },
  { id: 3, countryId: null, salary: 300, note: '' },
];

const country: Column<Row> = {
  title: 'Country',
  prop: 'countryId',
  editor: {
    type: 'select',
    options: [
      { value: 1, label: 'Morocco' },
      { value: 2, label: 'France' },
    ],
  },
};

function setup(columns: Column<Row>[]) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const table = new Tadabut(container, { data: rows, rowId: 'id', columns });

  const column = (index: number) =>
    [...container.querySelectorAll(`tbody tr td:nth-child(${index})`)].map((td) => td.textContent);

  const search = (text: string) => {
    const input = container.querySelector('.dt-search input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
  };

  return { table, container, column, search };
}

/** DataTables sorts on the next tick. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('labels in cells', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows the label of a fixed select list, and empty for null', () => {
    const { column } = setup([{ title: 'ID', prop: 'id' }, country]);

    expect(column(2)).toEqual(['Morocco', 'France', '']);
  });

  it('uses render over the select label', () => {
    const { column } = setup([
      { title: 'ID', prop: 'id' },
      {
        title: 'Country',
        prop: 'countryId',
        editor: { type: 'select', options: [{ value: 1, label: 'Morocco' }] },
        render: (value) => (value === null ? 'None' : `#${value}`),
      },
    ]);

    expect(column(2)).toEqual(['#1', '#2', 'None']);
  });

  it('gives render the whole row', () => {
    const { column } = setup([
      { title: 'ID', prop: 'id', render: (value, row) => `${value}: ${row.note.length}` },
    ]);

    expect(column(1)).toEqual(['1: 11', '2: 11', '3: 0']);
  });

  it('shows labels as text, never as HTML', () => {
    const { container, column } = setup([
      { title: 'ID', prop: 'id' },
      { title: 'Note', prop: 'note' },
      { title: 'Salary', prop: 'salary', render: () => '<img src=x onerror=alert(1)>' },
    ]);

    expect(column(2)).toEqual(['<b>bold</b>', 'Tom & Jerry', '']);
    expect(container.querySelector('tbody b')).toBeNull();
    expect(container.querySelector('tbody img')).toBeNull();
  });

  it('searches the label, not the raw value', () => {
    const { column, search } = setup([{ title: 'ID', prop: 'id' }, country]);

    search('France');

    expect(column(1)).toEqual(['2']);
  });

  it('searches the plain text, so & is found', () => {
    const { column, search } = setup([
      { title: 'ID', prop: 'id' },
      { title: 'Note', prop: 'note' },
    ]);

    search('Tom & J');

    expect(column(1)).toEqual(['2']);
  });

  it('sorts by the raw value, not the label', async () => {
    const { container, column } = setup([
      { title: 'Salary', prop: 'salary', render: (value) => `${value} MAD` },
    ]);

    // As text, '1000 MAD' would come before '200 MAD', both ways.
    expect(column(1)).toEqual(['200 MAD', '300 MAD', '1000 MAD']);

    (container.querySelector('thead th') as HTMLElement).click();
    await flush();

    expect(column(1)).toEqual(['1000 MAD', '300 MAD', '200 MAD']);
  });

  it('shows the new label after a save', async () => {
    const { table, container, column } = setup([{ title: 'ID', prop: 'id' }, country]);
    table.edit(1);
    const select = container.querySelector('tbody select') as HTMLSelectElement;
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));

    await table.save(1);

    expect(column(2)[0]).toBe('France');
  });

  it('puts the label back after a cancel', () => {
    const { table, column } = setup([{ title: 'ID', prop: 'id' }, country]);
    table.edit(1);

    table.cancel(1);

    expect(column(2)[0]).toBe('Morocco');
  });
});
