import { describe, expect, it, vi } from 'vitest';

import { type Column, Tadabut, type TadabutOptions } from '../../src/index';
import { goToPage, mountPoint, search, settle, type, waiting } from '../helpers';

type Row = {
  id: number;
  name: string;
  city: string;
  salary: number;
  countryId: number;
  cityId: number | null;
};

/** 12 rows: ids 1 to 12, names N12 down to N01, so sorting by name reverses them. */
function rows(): Row[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `N${String(12 - i).padStart(2, '0')}`,
    city: i < 3 ? 'Rabat' : 'Casablanca',
    salary: 1000 * (i + 1),
    countryId: 1,
    cityId: 10,
  }));
}

const columns: Column<Row>[] = [
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
  { title: 'City', prop: 'city' },
  { title: 'Salary', prop: 'salary', editor: { type: 'money' }, total: 'sum' },
];

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    // Keep the rows in data order, 10 per page.
    dataTables: { order: [] },
    ...options,
  });

  const names = () =>
    [...container.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('td')?.textContent);
  const footer = () => container.querySelectorAll('tfoot th')[2]?.textContent;

  return { container, table, names, footer };
}

/** Row 1 with other values, for inserting and updating. */
function like(changes: Partial<Row>): Row {
  return { ...rows()[0], ...changes } as Row;
}

describe('getData', () => {
  it('gives every row, in the order shown', () => {
    const { table } = setup({ dataTables: { order: [[0, 'asc']] } });

    expect(table.getData().map((row) => row.id)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('follows the scope', () => {
    const { table, container } = setup();

    expect(table.getData('page')).toHaveLength(10);

    search(container, 'Rabat');

    expect(table.getData('searched').map((row) => row.id)).toEqual([1, 2, 3]);
    expect(table.getData()).toHaveLength(12);
  });

  it('gives copies', () => {
    const { table, names } = setup();
    const [first] = table.getData();

    (first as Row).name = 'Changed';

    expect(table.getRow(1)?.name).toBe('N12');
    expect(names()[0]).toBe('N12');
  });
});

describe('getRow', () => {
  it('gives a copy of the row, or undefined', () => {
    const { table } = setup();
    const row = table.getRow(2) as Row;

    row.name = 'Changed';

    expect(table.getRow(2)?.name).toBe('N11');
    expect(table.getRow(99)).toBeUndefined();
  });

  it('gives the saved row while it is edited', () => {
    const { table, container } = setup();

    table.edit(1);
    type(container.querySelector<HTMLInputElement>('.tdb-input-text') as HTMLInputElement, 'Typed');

    expect(table.getRow(1)?.name).toBe('N12');
  });
});

describe('getApi', () => {
  it('gives the DataTables API', () => {
    const { table, container } = setup();

    table.getApi().page(1).draw(false);

    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
  });
});

describe('insertRow', () => {
  it('puts one row in, and updates the totals', () => {
    const { table, footer } = setup();

    table.insertRow(like({ id: 13, name: 'New', salary: 22000 }));

    expect(table.getRow(13)?.name).toBe('New');
    expect(footer()).toBe('100 000.00');
  });

  it('puts many rows in at once', () => {
    const { table } = setup();

    table.insertRow([like({ id: 13 }), like({ id: 14 })]);

    expect(table.getData()).toHaveLength(14);
  });

  it('keeps the page you are on', () => {
    const { table, container, names } = setup();

    goToPage(container, 1);
    table.insertRow(like({ id: 13, name: 'New' }));

    expect(names()).toEqual(['N02', 'N01', 'New']);
  });

  it('keeps its own copy', () => {
    const { table } = setup();
    const row = like({ id: 13, name: 'New' });

    table.insertRow(row);
    row.name = 'Changed';

    expect(table.getRow(13)?.name).toBe('New');
  });

  it("doesn't call onAdd or onAdded", () => {
    const onAdd = vi.fn();
    const onAdded = vi.fn();
    const { table } = setup({ onAdd, onAdded });

    table.insertRow(like({ id: 13 }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('throws for an id already in the table, and adds nothing', () => {
    const { table } = setup();

    expect(() => table.insertRow([like({ id: 13 }), like({ id: 2 })])).toThrow(
      'insertRow got the id 2, which is already in the table',
    );
    expect(table.getRow(13)).toBeUndefined();
  });

  it('throws for the same id twice', () => {
    const { table } = setup();

    expect(() => table.insertRow([like({ id: 13 }), like({ id: 13 })])).toThrow('the id 13');
    expect(table.getRow(13)).toBeUndefined();
  });

  it('throws for a row without an id', () => {
    const { table } = setup();

    expect(() => table.insertRow({ ...like({}), id: undefined } as unknown as Row)).toThrow(
      'a row given to insertRow has no "id"',
    );
  });

  it('throws without rowId', () => {
    const table = new Tadabut(mountPoint(), {
      data: rows(),
      columns: [{ title: 'Name', prop: 'name' }],
    });

    expect(() => table.insertRow(like({ id: 13 }))).toThrow('rowId is required with insertRow');
  });
});

describe('updateRow', () => {
  it('replaces the row with the same id, and updates the cells and totals', () => {
    const { table, names, footer } = setup();

    expect(table.updateRow({ ...(table.getRow(1) as Row), name: 'Nadia', salary: 2000 })).toBe(
      true,
    );

    expect(names()[0]).toBe('Nadia');
    expect(footer()).toBe('79 000.00');
  });

  it("doesn't call onSave or onSaved", () => {
    const onSave = vi.fn();
    const onSaved = vi.fn();
    const { table } = setup({ onSave, onSaved });

    table.updateRow(like({ name: 'Nadia' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('gives false for an id not in the table', () => {
    const { table } = setup();

    expect(table.updateRow(like({ id: 99 }))).toBe(false);
  });

  it('gives false for a row being edited, and keeps what was typed', () => {
    const { table, container } = setup();

    table.edit(1);
    type(container.querySelector<HTMLInputElement>('.tdb-input-text') as HTMLInputElement, 'Typed');

    expect(table.updateRow(like({ name: 'Server' }))).toBe(false);
    expect(container.querySelector<HTMLInputElement>('.tdb-input-text')?.value).toBe('Typed');
  });

  it('gives false for a row being deleted', async () => {
    const load = waiting<void>();
    const { table } = setup({ onDelete: load.fn });

    void table.delete(1);

    expect(table.updateRow(like({ name: 'Server' }))).toBe(false);

    load.resolve();
    await settle();
  });

  it('reloads an open detail', async () => {
    const { table, container } = setup({ detail: (row) => `About ${row.name}` });

    table.openDetail(1);
    await settle();
    table.updateRow(like({ name: 'Nadia' }));
    await settle();

    expect(container.querySelector('tr.tdb-row-detail')?.textContent).toBe('About Nadia');
  });

  it('keeps the tick of a selected row', () => {
    const { table, container } = setup({ selection: true });

    table.select([1]);
    table.updateRow(like({ name: 'Nadia' }));

    expect(container.querySelector<HTMLInputElement>('tbody .tdb-select-row')?.checked).toBe(true);
  });
});

describe('removeRow', () => {
  it('takes the row out, and updates the totals', () => {
    const { table, footer } = setup();

    expect(table.removeRow(12)).toBe(true);

    expect(table.getRow(12)).toBeUndefined();
    expect(footer()).toBe('66 000.00');
  });

  it("doesn't call onDelete or onDeleted, and doesn't ask", () => {
    const onDelete = vi.fn();
    const onDeleted = vi.fn();
    const confirmDelete = vi.fn(() => true);
    const { table } = setup({ onDelete, onDeleted, confirmDelete });

    table.removeRow(1);

    expect(onDelete).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(confirmDelete).not.toHaveBeenCalled();
  });

  it('takes it out of the selection, and calls onSelect', () => {
    const onSelect = vi.fn();
    const { table } = setup({ selection: true, onSelect });

    table.select([1, 2]);
    table.removeRow(1);

    expect(table.getSelected().map((row) => row.id)).toEqual([2]);
    expect(onSelect).toHaveBeenLastCalledWith([expect.objectContaining({ id: 2 })]);
  });

  it('closes its detail', async () => {
    const { table } = setup({ detail: () => 'x' });

    table.openDetail(1);
    await settle();
    table.removeRow(1);

    expect(table.isDetailOpen(1)).toBe(false);
  });

  it('gives false for an id not in the table, or a row being edited', () => {
    const { table } = setup();

    expect(table.removeRow(99)).toBe(false);

    table.edit(1);

    expect(table.removeRow(1)).toBe(false);
    expect(table.getRow(1)).toBeDefined();
  });
});

describe('getTotals', () => {
  const totalled: Column<Row>[] = [
    { title: 'Name', prop: 'name', total: (counted) => `${counted.length} people` },
    { title: 'City', prop: 'city', total: 'count' },
    { title: 'Salary', prop: 'salary', editor: { type: 'money', decimals: 3 }, total: 'avg' },
    { title: 'Id', prop: 'id', total: 'max', render: (value) => `#${value}` },
  ];

  it('gives plain numbers, and your function text', () => {
    const { table } = setup({ columns: totalled });

    expect(table.getTotals()).toEqual({ name: '12 people', city: 12, salary: 6500, id: 12 });
  });

  it('rounds like the footer, to the money decimals', () => {
    const { table } = setup({
      columns: totalled,
      data: [like({ salary: 1000.0004 }), like({ id: 2, salary: 1000.0005 })],
    });

    expect(table.getTotals().salary).toBe(1000);
  });

  it('counts the same rows as the footer', () => {
    const { table, container } = setup({ columns: totalled });

    search(container, 'Rabat');

    expect(table.getTotals().city).toBe(3);
  });

  it('is empty without totals, and skips totals with nothing to show', () => {
    expect(setup({ columns: [{ title: 'Name', prop: 'name' }] }).table.getTotals()).toEqual({});
    expect(setup({ columns: totalled, data: [] }).table.getTotals()).toEqual({
      name: '0 people',
      city: 0,
    });
  });
});

describe('getOptions', () => {
  const selects: Column<Row>[] = [
    { title: 'Name', prop: 'name' },
    {
      title: 'Country',
      prop: 'countryId',
      editor: { type: 'select', options: [{ value: 1, label: 'Morocco' }] },
    },
    {
      title: 'City',
      prop: 'cityId',
      editor: {
        type: 'select',
        dependsOn: 'countryId',
        options: async () => [
          { value: 10, label: 'Rabat' },
          { value: 11, label: 'Fès' },
        ],
      },
    },
  ];

  it('gives a fixed list as it is', () => {
    const { table } = setup({ columns: selects });

    expect(table.getOptions('countryId')).toEqual([{ value: 1, label: 'Morocco' }]);
  });

  it('gives undefined for a loaded list until a row loaded it, then keeps it', async () => {
    const { table } = setup({ columns: selects });

    expect(table.getOptions('cityId')).toBeUndefined();

    table.edit(1);
    await settle();
    table.cancel(1);

    expect(table.getOptions('cityId')).toEqual([
      { value: 10, label: 'Rabat' },
      { value: 11, label: 'Fès' },
    ]);
  });

  it('remembers lists loaded in the new row too', async () => {
    const { table } = setup({ columns: selects });

    table.add({ countryId: 1 });
    await settle();

    expect(table.getOptions('cityId')).toHaveLength(2);
  });

  it('gives undefined for a column that is not a select', () => {
    const { table } = setup({ columns: selects });

    expect(table.getOptions('name')).toBeUndefined();
  });
});
