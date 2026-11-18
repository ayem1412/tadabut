import { describe, expect, it, vi } from 'vitest';

import { type Column, fr, Tadabut, type TadabutOptions } from '../../src/index';
import { goToPage, mountPoint, search, type } from '../helpers';

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
  const container = mountPoint();
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    // Keep the rows in data order.
    dataTables: { order: [] },
    ...options,
  });

  const footer = () => [...container.querySelectorAll('tfoot th')].map((th) => th.textContent);

  return {
    container,
    table,
    footer,
    search: (text: string) => search(container, text),
    goToPage: (index: number) => goToPage(container, index),
  };
}

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

describe('counting the ticked rows', () => {
  const columns: Column<Row>[] = [{ title: 'Name', prop: 'name' }, salarySum];

  function ticked(options: Partial<TadabutOptions<Row>> = {}) {
    const result = setup(columns, { selection: true, totalRows: 'selected', ...options });

    /** Clicks the checkbox of the nth row shown, from 0. The rows keep data order. */
    const tick = (index: number): void => {
      result.container.querySelectorAll<HTMLInputElement>('tbody .tdb-select-row')[index]?.click();
    };

    return { ...result, tick };
  }

  it('needs selection', () => {
    expect(() => setup(columns, { totalRows: 'selected' })).toThrow(
      "Tadabut: totalRows: 'selected' needs selection.",
    );
  });

  it('counts nothing until a row is ticked', () => {
    const { footer } = ticked();

    expect(footer()[2]).toBe('0.00');
  });

  it('follows each tick, without a redraw', () => {
    const { footer, tick } = ticked();

    // Rows 1 and 3.
    tick(0);
    tick(2);

    expect(footer()[2]).toBe('4 000.00');

    tick(0);

    expect(footer()[2]).toBe('3 000.00');
  });

  it('follows the selection from code', () => {
    const { table, footer } = ticked();

    table.select([24, 25]);

    expect(footer()[2]).toBe('49 000.00');

    table.deselect([24]);

    expect(footer()[2]).toBe('25 000.00');

    table.clearSelection();

    expect(footer()[2]).toBe('0.00');
  });

  it('still counts ticked rows the search hides or that are on another page', () => {
    const { table, footer, search, goToPage } = ticked({
      dataTables: { order: [], pageLength: 5 },
    });

    table.select([1, 25]);
    search('N00');

    expect(footer()[2]).toBe('26 000.00');

    search('');
    goToPage(2);

    expect(footer()[2]).toBe('26 000.00');
  });

  it('uses the saved value of a ticked row', async () => {
    const { table, container, footer } = ticked();
    table.select([1]);
    table.edit(1);
    type(container.querySelector<HTMLInputElement>('.tdb-input-money') as HTMLInputElement, '7000');

    await table.save(1);

    expect(footer()[2]).toBe('7 000.00');
  });

  it('drops a ticked row once it is deleted', async () => {
    const { table, footer } = ticked();
    table.select([1, 2]);

    await table.delete(2);

    expect(footer()[2]).toBe('1 000.00');
  });

  it('drops ticked rows that setData removed', () => {
    const { table, footer } = ticked();
    table.select([1, 25]);

    table.setData(rows().slice(0, 2));

    expect(footer()[2]).toBe('1 000.00');
  });

  it('gives getTotals the same rows', () => {
    const { table } = ticked();

    table.select([2, 3]);

    expect(table.getTotals()).toEqual({ salary: 5000 });
  });
});

describe('keeping totals up to date', () => {
  const columns: Column<Row>[] = [{ title: 'Name', prop: 'name' }, salarySum];

  it('after a save', async () => {
    const { table, container, footer } = setup(columns);
    table.edit(1);
    type(
      container.querySelector<HTMLInputElement>('.tdb-input-money') as HTMLInputElement,
      '101000',
    );

    await table.save(1);

    expect(footer()[1]).toBe('425 000.00');
  });

  it('after an add', async () => {
    const { table, container, footer } = setup(columns);
    table.add({ id: 99, name: 'New' });
    type(
      container.querySelector<HTMLInputElement>(
        '.tdb-row-new .tdb-input-money',
      ) as HTMLInputElement,
      '5000',
    );

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
