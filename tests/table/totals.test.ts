import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Column, fr, Tadabut, type TadabutOptions } from '../../src/index';

type Row = { id: number; name: string; city: string; age: number; salary: number | null };

/** 25 rows: ids 1 to 25, ages 20 to 44, salaries 1 000 to 25 000, the 5 first in Rabat. */
function rows(): Row[] {
  return Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `N${String(i).padStart(2, '0')}`,
    city: i < 5 ? 'Rabat' : 'Casablanca',
    age: 20 + i,
    salary: 1000 * (i + 1),
  }));
}

const salarySum: Column<Row> = {
  title: 'Salary',
  prop: 'salary',
  editor: { type: 'money' },
  total: 'sum',
};

function setup(columns: Column<Row>[], options: Partial<TadabutOptions<Row>> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    // Keep the rows in data order.
    dataTables: { order: [] },
    ...options,
  });

  const footer = () => [...container.querySelectorAll('tfoot th')].map((th) => th.textContent);
  const search = (text: string) => {
    const input = container.querySelector<HTMLInputElement>('.dt-search input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const goToPage = (index: number) =>
    container.querySelector<HTMLElement>(`.dt-paging [data-dt-idx="${index}"]`)?.click();

  return { container, table, footer, search, goToPage };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the footer', () => {
  it('only exists when a column has a total', () => {
    const { container } = setup([{ title: 'Name', prop: 'name' }]);

    expect(container.querySelector('tfoot')).toBeNull();
  });

  it('puts Total in the first cell, and the total under its column', () => {
    const { container, footer } = setup([{ title: 'Name', prop: 'name' }, salarySum]);

    expect(container.querySelector('tfoot')?.classList.contains('tdb-totals')).toBe(true);
    // The last one is under the Edit button.
    expect(footer()).toEqual(['Total', '325 000.00', '']);
  });

  it('translates the label', () => {
    const { footer } = setup([{ title: 'Name', prop: 'name' }, salarySum], {
      texts: { ...fr, total: 'Somme' },
    });

    expect(footer()[0]).toBe('Somme');
  });

  it('has no label when the first column has a total of its own', () => {
    const { footer } = setup([{ title: 'Name', prop: 'name', total: 'count' }, salarySum]);

    expect(footer()).toEqual(['25', '325 000.00', '']);
  });

  it('skips hidden columns and leaves the buttons cell empty', () => {
    const { footer } = setup(
      [{ title: 'Name', prop: 'name' }, { title: 'City', prop: 'city', visible: false }, salarySum],
      { onDelete: () => {} },
    );

    expect(footer()).toEqual(['Total', '325 000.00', '']);
  });

  it('puts the column classes on its cell', () => {
    const { container } = setup([
      { title: 'Name', prop: 'name' },
      { ...salarySum, className: 'dt-right' } as Column<Row>,
    ]);

    expect(container.querySelectorAll('tfoot th')[1]?.classList.contains('dt-right')).toBe(true);
  });
});

describe('the kinds of totals', () => {
  it('adds up, averages, and finds the smallest and biggest', () => {
    const { footer } = setup([
      { title: 'Name', prop: 'name' },
      { title: 'Sum', prop: 'id', total: 'sum' },
      { title: 'Avg', prop: 'age', total: 'avg' },
      { title: 'Min', prop: 'salary', total: 'min' },
      { title: 'Max', prop: 'salary', total: 'max' },
    ]);

    expect(footer()).toEqual(['Total', '325', '32', '1000', '25000']);
  });

  it('rounds to 2 decimals', () => {
    const { table, footer } = setup([
      { title: 'Name', prop: 'name' },
      { title: 'Avg', prop: 'age', total: 'avg' },
    ]);

    // An average of 30.333…
    table.setData([30, 30, 31].map((age, i) => ({ ...rows()[i], age }) as Row));

    expect(footer()[1]).toBe('30.33');
  });

  it('skips empty values, and shows nothing when there is nothing to average', () => {
    const { table, footer } = setup([
      { title: 'Name', prop: 'name' },
      { title: 'Sum', prop: 'salary', total: 'sum' },
      { title: 'Avg', prop: 'salary', total: 'avg' },
    ]);

    table.setData([{ id: 1, name: 'A', city: 'Rabat', age: 30, salary: null }]);

    expect(footer()).toEqual(['Total', '0', '']);
  });

  it('counts the rows on any column, never as money', () => {
    const { footer } = setup([
      { title: 'Name', prop: 'name' },
      { ...salarySum, total: 'count' } as Column<Row>,
    ]);

    expect(footer()[1]).toBe('25');
  });

  it('lets a function write the text, as text', () => {
    const total = vi.fn((counted: readonly Row[]) => `<b>${counted.length}</b> people`);
    const { footer, container } = setup([
      { title: 'Name', prop: 'name' },
      { title: 'City', prop: 'city', total },
    ]);

    expect(footer()[1]).toBe('<b>25</b> people');
    expect(container.querySelector('tfoot b')).toBeNull();
    expect(total).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 1 })]),
    );
  });

  it("goes through the column's render", () => {
    const { footer } = setup([
      { title: 'Name', prop: 'name' },
      { title: 'Age', prop: 'age', total: 'avg', render: (value) => `${value} years` },
    ]);

    expect(footer()[1]).toBe('32 years');
  });

  it('uses render over the money format, like the cells', () => {
    const { footer } = setup([
      { title: 'Name', prop: 'name' },
      { ...salarySum, render: (value: number | null) => `${value} MAD` } as Column<Row>,
    ]);

    expect(footer()[1]).toBe('325000 MAD');
  });

  it('uses the money format of the column', () => {
    const { footer } = setup([
      { title: 'Name', prop: 'name' },
      { ...salarySum, editor: { type: 'money', separator: '.', point: ',' } } as Column<Row>,
    ]);

    expect(footer()[1]).toBe('325.000,00');
  });
});

describe('which rows count', () => {
  const columns: Column<Row>[] = [{ title: 'Name', prop: 'name' }, salarySum];

  it('counts the rows that match the search, on every page, by default', () => {
    const { footer, search } = setup(columns, { dataTables: { order: [], pageLength: 5 } });

    // N00 to N09: salaries 1 000 to 10 000, on 2 pages of 5.
    search('N0');

    expect(footer()[1]).toBe('55 000.00');
  });

  it('ignores the search with all', () => {
    const { footer, search } = setup(columns, { totalRows: 'all' });

    search('N0');

    expect(footer()[1]).toBe('325 000.00');
  });

  it('only counts the rows shown with page', () => {
    const { footer, goToPage } = setup(columns, { totalRows: 'page' });

    expect(footer()[1]).toBe('55 000.00');

    goToPage(2);

    // Rows 21 to 25.
    expect(footer()[1]).toBe('115 000.00');
  });
});

describe('keeping totals up to date', () => {
  const columns: Column<Row>[] = [{ title: 'Name', prop: 'name' }, salarySum];

  it('after a save', async () => {
    const { table, container, footer } = setup(columns);
    table.edit(1);
    const input = container.querySelector<HTMLInputElement>('.tdb-input-money') as HTMLInputElement;
    input.value = '101000';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await table.save(1);

    expect(footer()[1]).toBe('425 000.00');
  });

  it('after an add', async () => {
    const { table, container, footer } = setup(columns);
    table.add({ id: 99, name: 'New' });
    const input = container.querySelector<HTMLInputElement>('.tdb-row-new .tdb-input-money');
    (input as HTMLInputElement).value = '5000';
    input?.dispatchEvent(new Event('input', { bubbles: true }));

    await table.saveNew();

    expect(footer()[1]).toBe('330 000.00');
  });

  it('after a delete', async () => {
    const { table, footer } = setup(columns);

    await table.delete(25);

    expect(footer()[1]).toBe('300 000.00');
  });

  it('after setData', () => {
    const { table, footer } = setup(columns);

    table.setData(rows().slice(0, 2));

    expect(footer()[1]).toBe('3 000.00');
  });
});
