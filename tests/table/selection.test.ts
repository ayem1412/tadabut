import { describe, expect, it, vi } from 'vitest';

import { type Column, fr, Tadabut, type TadabutOptions } from '../../src/index';
import { goToPage, mountPoint, search, type } from '../helpers';

type Row = { id: number; name: string; city: string };

/** 25 rows: ids 1 to 25, the 3 first in Rabat. */
function rows(): Row[] {
  return Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `N${String(i).padStart(2, '0')}`,
    city: i < 3 ? 'Rabat' : 'Casablanca',
  }));
}

const columns: Column<Row>[] = [
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
  { title: 'City', prop: 'city' },
];

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const onSelect = vi.fn();
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    selection: true,
    onSelect,
    // Keep the rows in data order.
    dataTables: { order: [] },
    ...options,
  });

  /** The row checkboxes on the page shown. */
  const boxes = () => [...container.querySelectorAll<HTMLInputElement>('tbody .tdb-select-row')];
  const all = () =>
    container.querySelector<HTMLInputElement>('thead .tdb-select-all') as HTMLInputElement;
  const ids = () => table.getSelected().map((row) => row.id);
  /** The ids `onSelect` got last time. */
  const lastSelected = () => ((onSelect.mock.lastCall?.[0] ?? []) as Row[]).map((row) => row.id);

  return {
    container,
    table,
    onSelect,
    boxes,
    all,
    ids,
    lastSelected,
    search: (text: string) => search(container, text),
    goToPage: (index: number) => goToPage(container, index),
  };
}

/** Clicks a checkbox, like a user. */
function click(box: HTMLInputElement | undefined): void {
  box?.click();
}

describe('the checkbox column', () => {
  it('only exists with selection', () => {
    const { container } = setup({ selection: false });

    expect(container.querySelector('.tdb-select-row, .tdb-select-all')).toBeNull();
  });

  it('comes first, with a labelled checkbox in the header and in each row', () => {
    const { container, boxes, all } = setup();

    expect(container.querySelector('thead th')?.classList.contains('tdb-select')).toBe(true);
    expect(all().getAttribute('aria-label')).toBe('Select all');
    expect(boxes()).toHaveLength(10);
    expect(boxes()[0]?.getAttribute('aria-label')).toBe('Select row');
  });

  it('translates the labels', () => {
    const { all, boxes } = setup({ texts: fr });

    expect(all().getAttribute('aria-label')).toBe('Tout sélectionner');
    expect(boxes()[0]?.getAttribute('aria-label')).toBe('Sélectionner la ligne');
  });

  it('adds the select class to every checkbox', () => {
    const { container } = setup({ classNames: { select: 'form-check-input' } });

    expect(container.querySelectorAll('input.form-check-input')).toHaveLength(11);
  });

  it("doesn't sort by it", () => {
    const { container } = setup({ dataTables: undefined });

    // Sorted by Name, as without the checkboxes.
    expect(container.querySelector('tbody td:nth-child(2)')?.textContent).toBe('N00');
  });

  it('moves your order past it', () => {
    const { container } = setup({ dataTables: { order: [[0, 'desc']] } });

    expect(container.querySelector('tbody td:nth-child(2)')?.textContent).toBe('N24');
  });

  it('throws without rowId', () => {
    expect(
      () =>
        new Tadabut(mountPoint(), {
          data: rows(),
          columns: [{ title: 'Name', prop: 'name' }],
          selection: true,
        }),
    ).toThrow('rowId is required with selection');
  });
});

describe('ticking rows', () => {
  it('selects and unselects a row, and calls onSelect each time', () => {
    const { boxes, ids, onSelect, lastSelected, container } = setup();

    click(boxes()[0]);
    click(boxes()[2]);

    expect(ids()).toEqual([1, 3]);
    expect(lastSelected()).toEqual([1, 3]);
    expect(container.querySelectorAll('tr.tdb-row-selected')).toHaveLength(2);

    click(boxes()[0]);

    expect(ids()).toEqual([3]);
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it('keeps the ticks across pages', () => {
    const { boxes, goToPage } = setup();

    click(boxes()[1]);
    goToPage(1);

    expect(boxes().some((box) => box.checked)).toBe(false);

    goToPage(0);

    expect(boxes()[1]?.checked).toBe(true);
    expect(boxes()[1]?.closest('tr')?.classList.contains('tdb-row-selected')).toBe(true);
  });

  it("ignores the editors' own inputs", () => {
    const { table, container, onSelect, ids } = setup();

    table.edit(1);
    type(container.querySelector<HTMLInputElement>('.tdb-input') as HTMLInputElement, 'Amina');
    container.querySelector('.tdb-input')?.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(ids()).toEqual([]);
  });

  it('keeps the tick of a row after it is saved', async () => {
    const { table, boxes, container, onSelect } = setup();

    click(boxes()[0]);
    table.edit(1);
    type(container.querySelector<HTMLInputElement>('.tdb-input') as HTMLInputElement, 'Amina');
    await table.save(1);

    expect(boxes()[0]?.checked).toBe(true);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('check all', () => {
  it('takes every row that matches the search, on every page, by default', () => {
    const { all, ids, search } = setup();

    click(all());

    expect(ids()).toHaveLength(25);

    click(all());
    search('Rabat');
    click(all());

    expect(ids()).toEqual([1, 2, 3]);
  });

  it('shows a dash when only some rows are ticked', () => {
    const { all, boxes, search } = setup();

    search('Rabat');
    click(all());
    search('');

    expect(all().checked).toBe(false);
    expect(all().indeterminate).toBe(true);

    click(all());

    expect(all().checked).toBe(true);
    expect(all().indeterminate).toBe(false);

    click(boxes()[0]);

    expect(all().indeterminate).toBe(true);
  });

  it('is ticked when every searched row is, even with others hidden', () => {
    const { all, search, table } = setup();

    table.select([1, 2, 3]);
    search('Rabat');

    expect(all().checked).toBe(true);
  });

  it('only takes the page shown with page', () => {
    const { all, ids, goToPage } = setup({ selection: { checkAll: 'page' } });

    goToPage(1);
    click(all());

    expect(ids()).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('ignores the search with all', () => {
    const { all, ids, search } = setup({ selection: { checkAll: 'all' } });

    search('Rabat');
    click(all());

    expect(ids()).toHaveLength(25);
  });

  it('unticking only removes the rows it takes', () => {
    const { all, ids, search, table } = setup();

    table.select([1, 20]);
    search('Rabat');
    click(all());
    click(all());

    expect(ids()).toEqual([20]);
  });
});

describe('from code', () => {
  it('selects and unselects rows', () => {
    const { table, boxes, lastSelected } = setup();

    table.select([2, 3]);

    expect(table.isSelected(2)).toBe(true);
    expect(boxes()[1]?.checked).toBe(true);
    expect(lastSelected()).toEqual([2, 3]);

    table.deselect([2]);

    expect(table.isSelected(2)).toBe(false);
    expect(lastSelected()).toEqual([3]);
  });

  it('skips ids that are not in the table', () => {
    const { table, onSelect } = setup();

    table.select([999]);

    expect(table.isSelected(999)).toBe(false);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("doesn't call onSelect when nothing changed", () => {
    const { table, onSelect } = setup();

    table.select([1]);
    table.select([1]);
    table.deselect([2]);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('clears the selection', () => {
    const { table, boxes, lastSelected, onSelect } = setup();

    table.select([1, 2]);
    table.clearSelection();

    expect(table.getSelected()).toEqual([]);
    expect(boxes().some((box) => box.checked)).toBe(false);
    expect(lastSelected()).toEqual([]);

    table.clearSelection();

    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('includes rows hidden by the search', () => {
    const { table, search } = setup();

    table.select([1, 20]);
    search('Rabat');

    expect(table.getSelected().map((row) => row.id)).toEqual([1, 20]);
  });

  it('does nothing without selection', () => {
    const { table } = setup({ selection: false });

    table.select([1]);

    expect(table.getSelected()).toEqual([]);
    expect(table.isSelected(1)).toBe(false);
  });
});

describe('when rows go away', () => {
  it('forgets a deleted row', async () => {
    const { table, ids, lastSelected } = setup({ onDelete: () => {} });

    table.select([1, 2]);
    await table.delete(1);

    expect(ids()).toEqual([2]);
    expect(lastSelected()).toEqual([2]);
  });

  it('forgets rows that setData removed, and keeps the others', () => {
    const { table, ids, boxes } = setup();

    table.select([1, 20]);
    table.setData(rows().slice(0, 5));

    expect(ids()).toEqual([1]);
    expect(boxes()[0]?.checked).toBe(true);
  });

  it("doesn't call onSelect when setData kept every selected row", () => {
    const { table, onSelect } = setup();

    table.select([1]);
    table.setData(rows());

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('leaves the new row without a checkbox', () => {
    const { table, container } = setup();

    table.add();

    const newRow = container.querySelector('tr.tdb-row-new');

    expect(newRow?.querySelector('input[type="checkbox"]')).toBeNull();
    // An empty cell under the checkbox column, then Name, City and the buttons.
    expect(newRow?.children).toHaveLength(4);
    expect(newRow?.children[0]?.childElementCount).toBe(0);
  });

  it('stops listening once destroyed', () => {
    const { table, onSelect, container } = setup();
    const box = container.querySelector<HTMLInputElement>('tbody .tdb-select-row');

    table.destroy();
    box?.click();

    expect(onSelect).not.toHaveBeenCalled();
  });
});
