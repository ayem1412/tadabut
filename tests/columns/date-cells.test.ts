import { describe, expect, it, vi } from 'vitest';

import { type Column, Tadabut, type TadabutOptions } from '../../src/index';
import { mountPoint, search, type } from '../helpers';

type Row = { id: number; name: string; hired: string | null };

const rows: Row[] = [
  { id: 1, name: 'Amina', hired: '05/06/2024' },
  { id: 2, name: 'Youness', hired: '12/01/2023' },
  { id: 3, name: 'Salma', hired: '05/01/2024' },
  { id: 4, name: 'Karim', hired: null },
];

const hired: Column<Row> = {
  title: 'Hired',
  prop: 'hired',
  editor: { type: 'date', format: 'dd/mm/yyyy' },
};

function setup(column: Column<Row> = hired, options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
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
  /** Clicks the Hired header, which sorts by it. */
  const sort = () => {
    container
      .querySelectorAll<HTMLElement>('thead th')[1]
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  return { container, table, cells, names, sort };
}

describe('date cells', () => {
  it('show the value as written when there is no display', () => {
    const { cells } = setup();

    expect(cells()).toEqual(['05/06/2024', '12/01/2023', '05/01/2024', '']);
  });

  it('show it in display', () => {
    const { cells } = setup({
      ...hired,
      editor: { type: 'date', format: 'dd/mm/yyyy', display: 'dd.mm.yyyy' },
    });

    expect(cells()).toEqual(['05.06.2024', '12.01.2023', '05.01.2024', '']);
  });

  it('turn ISO data into dd/mm/yyyy', () => {
    const container = mountPoint();
    new Tadabut(container, {
      data: [{ id: 1, hired: '2024-01-05T10:30:00' }],
      rowId: 'id',
      columns: [{ title: 'Hired', prop: 'hired', editor: { type: 'date', display: 'dd/mm/yyyy' } }],
    });

    expect(container.querySelector('tbody td')?.textContent).toBe('05/01/2024');
  });

  it('show a value that is not a date as it is', () => {
    const container = mountPoint();
    new Tadabut(container, {
      data: [{ id: 1, hired: '31/02/2024' }],
      rowId: 'id',
      columns: [{ title: 'Hired', prop: 'hired', editor: { type: 'date', format: 'dd/mm/yyyy' } }],
    });

    expect(container.querySelector('tbody td')?.textContent).toBe('31/02/2024');
  });

  it('let render win, with the raw value', () => {
    const { cells } = setup({
      ...hired,
      render: (value: string | null) => `on ${value}`,
    } as Column<Row>);

    expect(cells()[0]).toBe('on 05/06/2024');
  });
});

describe('sorting dates', () => {
  it('sorts by the real date, empty first', () => {
    const { names } = setup(hired, { dataTables: { order: [[1, 'asc']] } });

    expect(names()).toEqual(['Karim', 'Youness', 'Salma', 'Amina']);
  });

  it('sorts backwards too', () => {
    const { names } = setup(hired, { dataTables: { order: [[1, 'desc']] } });

    expect(names()).toEqual(['Amina', 'Salma', 'Youness', 'Karim']);
  });

  it('sorts by the date whatever the display', () => {
    const { names } = setup(
      { ...hired, editor: { type: 'date', format: 'dd/mm/yyyy', display: 'mm/dd/yyyy' } },
      { dataTables: { order: [[1, 'asc']] } },
    );

    expect(names()).toEqual(['Karim', 'Youness', 'Salma', 'Amina']);
  });
});

describe('searching dates', () => {
  it('finds what the cell shows', () => {
    const { container, names } = setup({
      ...hired,
      editor: { type: 'date', format: 'dd/mm/yyyy', display: 'dd.mm.yyyy' },
    });

    search(container, '05.01');

    expect(names()).toEqual(['Salma']);
  });
});

describe('saving dates', () => {
  it('gives onSave the date in format, and shows it in display', async () => {
    const onSave = vi.fn();
    const { table, container, cells } = setup(
      { ...hired, editor: { type: 'date', format: 'dd/mm/yyyy', display: 'dd.mm.yyyy' } },
      { onSave },
    );

    table.edit(3);
    type(
      container.querySelector<HTMLInputElement>('.tdb-input-date') as HTMLInputElement,
      '2024-02-29',
    );
    await table.save(3);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ hired: '29/02/2024' }),
      expect.anything(),
    );
    expect(cells()[2]).toBe('29.02.2024');
  });

  it('keeps the time out when the value had one', async () => {
    const onSave = vi.fn();
    const container = mountPoint();
    const table = new Tadabut(container, {
      data: [{ id: 1, hired: '2024-01-05T10:30:00' as string | null }],
      rowId: 'id',
      columns: [{ title: 'Hired', prop: 'hired', editor: { type: 'date' } }],
      onSave,
    });

    table.edit(1);
    await table.save(1);

    expect(onSave).toHaveBeenCalledWith({ id: 1, hired: '2024-01-05' }, expect.anything());
  });
});

describe('checking min and max', () => {
  it('throws when they are not written in format', () => {
    expect(() =>
      setup({ ...hired, editor: { type: 'date', format: 'dd/mm/yyyy', min: '2020-01-01' } }),
    ).toThrow('the "hired" column\'s date "2020-01-01" isn\'t a real date written as dd/mm/yyyy');
  });

  it('throws for a day that does not exist', () => {
    expect(() => setup({ ...hired, editor: { type: 'date', max: '2030-02-30' } })).toThrow(
      '"2030-02-30"',
    );
  });

  it('accepts them in format', () => {
    expect(() =>
      setup({
        ...hired,
        editor: { type: 'date', format: 'dd/mm/yyyy', min: '01/01/2020', max: '31/12/2030' },
      }),
    ).not.toThrow();
  });
});
