import { describe, expect, it, vi } from 'vitest';

import { type Column, Tadabut, type TadabutOptions } from '../../src/index';
import { goToPage, mountPoint, search } from '../helpers';

type Row = { id: number; name: string };

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
];

/** 12 rows: ids 1 to 12, named Row 1 to Row 12. */
function rows(): Row[] {
  return Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));
}

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    currentRow: true,
    onDelete: () => {},
    confirmDelete: false,
    // Keep the rows in data order.
    dataTables: { order: [] },
    ...options,
  });

  /** The `<tr>` of DataTables' rows shown, from 0. Never the new row. */
  const tr = (index: number) =>
    container.querySelectorAll<HTMLTableRowElement>('tbody:not(.tdb-new-rows) > tr')[index];

  /** Clicks the name cell of the nth row shown. `detail` is the click count, 2 for the second click of a double click. */
  const click = (index: number, detail = 1): void => {
    tr(index)
      ?.querySelectorAll('td')[1]
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }));
  };

  /** The ids of the highlighted `<tr>`s on the page. */
  const highlighted = () =>
    [...container.querySelectorAll('tr.tdb-row-current')].map(
      (node) => node.querySelector('td')?.textContent,
    );

  return { container, table, tr, click, highlighted };
}

describe('the option', () => {
  it('is off by default: clicks highlight nothing', () => {
    const { table, click, highlighted } = setup({ currentRow: undefined });

    click(0);

    expect(highlighted()).toEqual([]);
    expect(table.getCurrent()).toBeUndefined();
    expect(table.setCurrent(1)).toBe(false);
    expect(table.isCurrent(1)).toBe(false);
  });

  it('needs rowId', () => {
    expect(
      () =>
        new Tadabut(mountPoint(), {
          data: rows(),
          columns: [{ title: 'Name', prop: 'name' }],
          currentRow: true,
        }),
    ).toThrow('Tadabut: rowId is required with currentRow.');
  });
});

describe('clicking', () => {
  it('highlights the row, one at a time', () => {
    const { table, click, tr, highlighted } = setup();

    click(0);

    expect(highlighted()).toEqual(['1']);
    expect(tr(0)?.getAttribute('aria-current')).toBe('true');

    click(2);

    expect(highlighted()).toEqual(['3']);
    expect(tr(0)?.hasAttribute('aria-current')).toBe(false);
    expect(table.getCurrent()).toEqual({ id: 3, name: 'Row 3' });
  });

  it('removes the highlight when the row is clicked again', () => {
    const { table, click, highlighted } = setup();

    click(0);
    click(0);

    expect(highlighted()).toEqual([]);
    expect(table.getCurrent()).toBeUndefined();
  });

  it('keeps the highlight through a double click', () => {
    const { table, click } = setup();

    click(0, 1);
    click(0, 2);

    expect(table.isCurrent(1)).toBe(true);
  });

  it('ignores the clicks onRowClick ignores', () => {
    const { table, container, tr, click } = setup();

    tr(0)?.querySelector<HTMLElement>('[data-tdb-action="delete"]')?.closest('td')?.click();
    table.edit(2);
    click(1);
    table.add({ id: 99 });
    container.querySelector<HTMLElement>('.tdb-row-new td')?.click();

    expect(table.getCurrent()).toBeUndefined();
  });

  it('is already up to date in onRowClick', () => {
    const seen: boolean[] = [];
    const { table, click } = setup({ onRowClick: (row) => seen.push(table.isCurrent(row.id)) });

    click(0);
    click(0);

    expect(seen).toEqual([true, false]);
  });

  it('adds your classes too', () => {
    const { tr, click } = setup({ classNames: { current: 'table-active  bold' } });

    click(0);

    expect(tr(0)?.className).toContain('table-active bold');

    click(0);

    expect(tr(0)?.classList.contains('table-active')).toBe(false);
  });
});

describe('from code', () => {
  it('highlights with setCurrent, and never toggles', () => {
    const { table, highlighted } = setup();

    expect(table.setCurrent(2)).toBe(true);
    expect(table.setCurrent(2)).toBe(true);

    expect(highlighted()).toEqual(['2']);
  });

  it('removes the highlight with null', () => {
    const { table, highlighted } = setup();
    table.setCurrent(2);

    expect(table.setCurrent(null)).toBe(true);

    expect(highlighted()).toEqual([]);
  });

  it('refuses an id that is not in the table, and keeps the highlight', () => {
    const { table } = setup();
    table.setCurrent(2);

    expect(table.setCurrent(99)).toBe(false);

    expect(table.isCurrent(2)).toBe(true);
  });

  it('gives a copy with getCurrent', () => {
    const { table } = setup();
    table.setCurrent(1);

    const row = table.getCurrent() as Row;
    row.name = 'Changed';

    expect(table.getCurrent()?.name).toBe('Row 1');
  });
});

describe('onCurrentChange', () => {
  it('fires each time the highlight moves, by a click or from code', () => {
    const onCurrentChange = vi.fn();
    const { table, click } = setup({ onCurrentChange });

    click(0);
    table.setCurrent(3);
    click(2);

    expect(onCurrentChange.mock.calls).toEqual([
      [{ id: 1, name: 'Row 1' }],
      [{ id: 3, name: 'Row 3' }],
      [null],
    ]);
  });

  it("doesn't fire when nothing changed", () => {
    const onCurrentChange = vi.fn();
    const { table } = setup({ onCurrentChange });

    table.setCurrent(null);
    table.setCurrent(99);
    table.setCurrent(2);
    table.setCurrent(2);

    expect(onCurrentChange).toHaveBeenCalledTimes(1);
  });
});

describe('when rows move', () => {
  it('stays through paging and search, even when the row is hidden', () => {
    const { container, table, highlighted } = setup();
    table.setCurrent(1);

    goToPage(container, 1);

    expect(highlighted()).toEqual([]);
    expect(table.isCurrent(1)).toBe(true);

    goToPage(container, 0);

    expect(highlighted()).toEqual(['1']);

    search(container, 'Row 12');
    search(container, '');

    expect(highlighted()).toEqual(['1']);
  });

  it('stays after the row is saved', async () => {
    const { table, highlighted } = setup();
    table.setCurrent(1);
    table.edit(1);

    await table.save(1);

    expect(highlighted()).toEqual(['1']);
  });

  it('goes away with the row after a delete, a removeRow or setData', async () => {
    const onCurrentChange = vi.fn();
    const { table } = setup({ onCurrentChange });

    table.setCurrent(1);
    await table.delete(1);
    table.setCurrent(2);
    table.removeRow(2);
    table.setCurrent(3);
    table.setData(rows().slice(3));

    expect(table.getCurrent()).toBeUndefined();
    expect(onCurrentChange.mock.calls.map(([row]) => row?.id ?? null)).toEqual([
      1,
      null,
      2,
      null,
      3,
      null,
    ]);
  });

  it('stays after setData when the row is still there', () => {
    const onCurrentChange = vi.fn();
    const { table, highlighted } = setup({ onCurrentChange });
    table.setCurrent(5);

    table.setData(rows().slice(2));

    expect(highlighted()).toEqual(['5']);
    expect(onCurrentChange).toHaveBeenCalledTimes(1);
  });
});
