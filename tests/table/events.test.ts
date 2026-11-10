import { describe, expect, it, vi } from 'vitest';

import { type Column, Tadabut, type TadabutOptions } from '../../src/index';
import { mountPoint, settle, type } from '../helpers';

type Row = { id: number; name: string; total: number };

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
  { title: 'Total', prop: 'total', total: 'sum' },
];

function rows(): Row[] {
  return [
    { id: 1, name: 'Amina', total: 10 },
    { id: 2, name: 'Salma', total: 20 },
  ];
}

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    dataTables: { order: [] },
    ...options,
  });

  /** A cell of DataTables' rows, by row and column, from 0. Never the new row. */
  const cell = (row: number, column: number) =>
    container
      .querySelector('tbody:not(.tdb-new-rows)')
      ?.querySelectorAll('tr')
      [row]?.querySelectorAll('td')[column] as HTMLElement;

  return { container, table, cell };
}

function nameInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('.tdb-input') as HTMLInputElement;
}

function doubleClick(element: Element | null | undefined): void {
  element?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
}

describe('onEditStart', () => {
  it('is called with the row, from the button and from code', () => {
    const onEditStart = vi.fn();
    const { table, container } = setup({ onEditStart, editing: { mode: 'multiple' } });

    container.querySelector<HTMLElement>('[data-tdb-action="edit"]')?.click();
    table.edit(2);

    expect(onEditStart.mock.calls.map(([row]) => row.id)).toEqual([1, 2]);
  });

  it('keeps the row closed when it returns false', () => {
    const { table, container } = setup({ onEditStart: (row) => row.id !== 1 });

    expect(table.edit(1)).toBe(false);
    expect(table.isEditing(1)).toBe(false);
    expect(container.querySelector('.tdb-input')).toBeNull();
    expect(table.edit(2)).toBe(true);
  });

  it("isn't called when the row can't open anyway", () => {
    const onEditStart = vi.fn();
    const { table } = setup({ onEditStart });

    table.edit(1);
    table.edit(2);
    table.edit(99);

    expect(onEditStart).toHaveBeenCalledTimes(1);
  });

  it("isn't called for the new row", () => {
    const onEditStart = vi.fn();
    const { table } = setup({ onEditStart });

    table.add();

    expect(onEditStart).not.toHaveBeenCalled();
  });
});

describe('onSaved, onAdded and onDeleted', () => {
  it('onSaved gets the saved row and the one before', async () => {
    const onSaved = vi.fn();
    const { table, container } = setup({
      onSave: (row) => ({ ...row, name: row.name.toUpperCase() }),
      onSaved,
    });

    table.edit(1);
    type(nameInput(container), 'Nadia');
    await table.save(1);

    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'NADIA' }), {
      previous: expect.objectContaining({ id: 1, name: 'Amina' }),
    });
  });

  it('onSaved is called once the row is closed and the table updated', async () => {
    const { table, container, cell } = setup({
      onSaved: () => {
        expect(table.isEditing(1)).toBe(false);
        expect(cell(0, 1).textContent).toBe('Nadia');
        expect(container.querySelector('tfoot th:nth-child(3)')?.textContent).toBe('30');
      },
    });

    table.edit(1);
    type(nameInput(container), 'Nadia');

    expect(await table.save(1)).toBe(true);
  });

  it("onSaved isn't called when the save fails or isn't valid", async () => {
    const onSaved = vi.fn();
    const { table, container } = setup({
      columns: [{ title: 'Name', prop: 'name', editor: { type: 'text', required: true } }],
      onSave: () => {
        throw new Error('No');
      },
      onSaved,
    });

    table.edit(1);
    await table.save(1);
    type(nameInput(container), '');
    await table.save(1);

    expect(onSaved).not.toHaveBeenCalled();
  });

  it('onAdded gets the row as the table holds it', async () => {
    const onAdded = vi.fn();
    const { table, container } = setup({
      onAdd: (row) => ({ ...row, id: 3, total: 0 }) as Row,
      onAdded,
    });

    table.add();
    type(nameInput(container), 'Karim');
    await table.saveNew();

    expect(onAdded).toHaveBeenCalledWith(expect.objectContaining({ id: 3, name: 'Karim' }));
  });

  it("onAdded isn't called when the add fails", async () => {
    const onAdded = vi.fn();
    const { table, container } = setup({
      onAdd: () => {
        throw new Error('No');
      },
      onAdded,
    });

    table.add({ id: 3 });
    type(nameInput(container), 'Karim');
    await table.saveNew();

    expect(onAdded).not.toHaveBeenCalled();
  });

  it('onDeleted gets the row once it left the table', async () => {
    const { table, container } = setup({
      onDeleted: (row) => {
        expect(row.id).toBe(1);
        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
      },
    });

    expect(await table.delete(1)).toBe(true);
  });

  it("onDeleted isn't called when the delete fails", async () => {
    const onDeleted = vi.fn();
    const { table } = setup({
      onDelete: () => {
        throw new Error('No');
      },
      onDeleted,
    });

    await table.delete(1);

    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('a throwing callback leaves the table done', async () => {
    const { table, container, cell } = setup({
      onSaved: () => {
        throw new Error('Bug in onSaved');
      },
    });

    table.edit(1);
    type(nameInput(container), 'Nadia');

    await expect(table.save(1)).rejects.toThrow('Bug in onSaved');
    expect(table.isEditing(1)).toBe(false);
    expect(cell(0, 1).textContent).toBe('Nadia');
  });
});

describe('onRowClick', () => {
  it('is called with the row and the event', () => {
    const onRowClick = vi.fn();
    const { cell } = setup({ onRowClick });

    cell(1, 0).click();

    expect(onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2 }),
      expect.any(MouseEvent),
    );
  });

  it('works without rowId or editors', () => {
    const onRowClick = vi.fn();
    const container = mountPoint();
    new Tadabut(container, {
      data: rows(),
      columns: [{ title: 'Name', prop: 'name' }],
      onRowClick,
    });

    container.querySelector<HTMLElement>('tbody td')?.click();

    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('ignores the buttons, the buttons cell and the checkboxes', () => {
    const onRowClick = vi.fn();
    const { container } = setup({ onRowClick, onDelete: () => {}, selection: true });

    container.querySelector<HTMLElement>('[data-tdb-action="delete"]')?.click();
    container.querySelector<HTMLElement>('[data-tdb-action="keep"]')?.click();
    container.querySelector<HTMLElement>('td.tdb-actions')?.click();
    container.querySelector<HTMLElement>('.tdb-select-row')?.click();
    container.querySelector<HTMLElement>('td.tdb-select')?.click();

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('ignores an icon inside a button', () => {
    const onRowClick = vi.fn();
    const { container } = setup({ onRowClick });
    const icon = document.createElement('i');
    container.querySelector('[data-tdb-action="edit"]')?.append(icon);

    icon.click();

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('ignores links in cells', () => {
    const onRowClick = vi.fn();
    const { container } = setup({
      onRowClick,
      columns: [{ title: 'Name', prop: 'name', render: (value) => `<a href="#x">${value}</a>` }],
    });

    container.querySelector<HTMLElement>('tbody a')?.click();

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('ignores a row being edited, and the new row', () => {
    const onRowClick = vi.fn();
    const { table, container, cell } = setup({ onRowClick, editing: { mode: 'multiple' } });

    table.edit(1);
    cell(0, 0).click();
    nameInput(container).click();
    table.add();
    container.querySelector<HTMLElement>('.tdb-row-new td')?.click();

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('ignores the header, the footer and error lines', async () => {
    const onRowClick = vi.fn();
    const { table, container } = setup({
      onRowClick,
      onDelete: () => {
        throw new Error('No');
      },
    });

    await table.delete(1);
    await settle();
    container.querySelector<HTMLElement>('thead th')?.click();
    container.querySelector<HTMLElement>('tfoot th')?.click();
    container.querySelector<HTMLElement>('tr.tdb-row-error td')?.click();

    expect(container.querySelector('tr.tdb-row-error')).not.toBeNull();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('stops after destroy', () => {
    const onRowClick = vi.fn();
    const { table, cell } = setup({ onRowClick });
    const td = cell(0, 0);

    table.destroy();
    td.click();

    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe('onRowDoubleClick and editing.doubleClick', () => {
  it('calls onRowDoubleClick with the same rules, without opening the row', () => {
    const onRowDoubleClick = vi.fn();
    const { table, cell, container } = setup({ onRowDoubleClick });

    doubleClick(cell(0, 0));
    doubleClick(container.querySelector('[data-tdb-action="edit"]'));

    expect(onRowDoubleClick).toHaveBeenCalledTimes(1);
    expect(onRowDoubleClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.any(MouseEvent),
    );
    expect(table.isEditing(1)).toBe(false);
  });

  it('opens the row with doubleClick, before calling onRowDoubleClick', () => {
    const { table, cell } = setup({
      editing: { doubleClick: true },
      onRowDoubleClick: () => {
        expect(table.isEditing(1)).toBe(true);
      },
    });

    doubleClick(cell(0, 0));

    expect(table.isEditing(1)).toBe(true);
  });

  it('goes through onEditStart and the single mode', () => {
    const onRowDoubleClick = vi.fn();
    const { table, cell } = setup({
      editing: { doubleClick: true },
      onEditStart: (row) => row.id !== 2,
      onRowDoubleClick,
    });

    doubleClick(cell(1, 0));

    expect(table.isEditing(2)).toBe(false);

    table.add();
    doubleClick(cell(0, 0));

    expect(table.isEditing(1)).toBe(false);
    expect(onRowDoubleClick).toHaveBeenCalledTimes(2);
  });

  it("doesn't open anything without doubleClick", () => {
    const { table, cell } = setup();

    doubleClick(cell(0, 0));

    expect(table.isEditing(1)).toBe(false);
  });
});
