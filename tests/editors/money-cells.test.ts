import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Column, Tadabut, type TadabutOptions } from '../../src/index';

type Row = { id: number; name: string; salary: number | null };

const rows: Row[] = [
  { id: 1, name: 'Amina', salary: 12500 },
  { id: 2, name: 'Youness', salary: 9000.5 },
  { id: 3, name: 'Salma', salary: null },
];

const salary: Column<Row> = {
  title: 'Salary',
  prop: 'salary',
  editor: { type: 'money', min: 1000 },
};

function setup(column: Column<Row> = salary, options: Partial<TadabutOptions<Row>> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const table = new Tadabut(container, {
    data: rows,
    rowId: 'id',
    columns: [{ title: 'Name', prop: 'name' }, column],
    // Keep the rows in data order.
    dataTables: { order: [] },
    ...options,
  });

  const cells = () =>
    [...container.querySelectorAll('tbody tr')].map(
      (tr) => tr.querySelectorAll('td')[1]?.textContent,
    );
  const names = () =>
    [...container.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('td')?.textContent);
  const search = (text: string) => {
    const input = container.querySelector<HTMLInputElement>('.dt-search input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const typeSalary = (text: string) => {
    const input = container.querySelector<HTMLInputElement>(
      'tbody .tdb-input-money',
    ) as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  return { container, table, cells, names, search, typeSalary };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('money cells', () => {
  it('show the money format', () => {
    const { cells } = setup();

    expect(cells()).toEqual(['12 500.00', '9 000.50', '']);
  });

  it('follow the editor format', () => {
    const { cells } = setup({
      ...salary,
      editor: { type: 'money', separator: '.', point: ',', decimals: 0 },
    } as Column<Row>);

    expect(cells()).toEqual(['12.500', '9.001', '']);
  });

  it('use render instead when there is one', () => {
    const { cells } = setup({
      ...salary,
      render: (value: number | null) => (value === null ? '-' : `${value} MAD`),
    } as Column<Row>);

    expect(cells()).toEqual(['12500 MAD', '9000.5 MAD', '-']);
  });

  it('can be found by the shown text and by the plain number', () => {
    const { names, search } = setup();

    search('12 500');
    expect(names()).toEqual(['Amina']);

    search('12500');
    expect(names()).toEqual(['Amina']);
  });

  it('sort by number, not by text', () => {
    const { container, names } = setup(salary, { dataTables: { order: [[1, 'asc']] } });

    expect(names()).toEqual(['Salma', 'Youness', 'Amina']);
    expect(container.querySelector('tbody td')).not.toBeNull();
  });
});

describe('saving a money field', () => {
  it('saves a plain number and shows it formatted', async () => {
    const onSave = vi.fn();
    const { table, cells, typeSalary } = setup(salary, { onSave });

    table.edit(1);
    typeSalary('14 250,5');
    await table.save(1);

    expect(onSave).toHaveBeenCalledWith(
      { id: 1, name: 'Amina', salary: 14250.5 },
      expect.anything(),
    );
    expect(cells()[0]).toBe('14 250.50');
  });

  it('checks min like a number', async () => {
    const { table, container, typeSalary } = setup();

    table.edit(1);
    typeSalary('500');

    expect(await table.save(1)).toBe(false);
    expect(container.querySelector('.tdb-error')?.textContent).toBe('Must be 1000 or more.');
  });

  it("refuses a separator that's also the point", () => {
    expect(() =>
      setup({ ...salary, editor: { type: 'money', separator: ',', point: ',' } } as Column<Row>),
    ).toThrow('Tadabut: the "salary" column\'s money separator and point can\'t both be ",".');
  });
});
