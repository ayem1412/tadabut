import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Column, type EditingOptions, type EditorInstance, Tadabut } from '../../src/index';

type Row = { id: number; name: string; age: number; city: string };

const rows: Row[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Name ${i + 1}`,
  age: 20 + i,
  city: 'Rabat',
}));

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
  { title: 'Age', prop: 'age', editor: { type: 'number' } },
  { title: 'City', prop: 'city' },
];

function setup(tableColumns: Column<Row>[] = columns, editing?: EditingOptions) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const table = new Tadabut(container, {
    data: rows,
    rowId: 'id',
    columns: tableColumns,
    editing,
  });

  return { container, table };
}

function rowCells(container: HTMLElement, id: number): HTMLTableCellElement[] {
  const row = [...container.querySelectorAll('tbody tr')].find(
    (tr) => tr.querySelector('td')?.textContent === String(id),
  );

  return [...(row?.querySelectorAll('td') ?? [])];
}

function inputsIn(container: HTMLElement): HTMLInputElement[] {
  return [...container.querySelectorAll<HTMLInputElement>('tbody input')];
}

function clickPage(container: HTMLElement, page: 'next' | 'previous'): void {
  container.querySelector<HTMLButtonElement>(`button[data-dt-idx="${page}"]`)?.click();
}

function trackedEditor(): {
  column: Column<Row>;
  destroy: ReturnType<typeof vi.fn>;
} {
  const destroy = vi.fn();
  const editor: EditorInstance<string> = {
    element: document.createElement('span'),
    getValue: () => '',
    setValue: vi.fn(),
    focus: vi.fn(),
    destroy,
  };

  return {
    column: {
      title: 'Name',
      prop: 'name',
      editor: { type: 'custom', create: () => editor },
    },
    destroy,
  };
}

describe('editing a row', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('puts editors with the row values in the editable cells', () => {
    const { container, table } = setup();

    expect(table.edit(1)).toBe(true);

    const [id, name, age, city] = rowCells(container, 1);
    expect(name?.querySelector('input')?.value).toBe('Name 1');
    expect(age?.querySelector('input')?.value).toBe('20');
    expect(id?.textContent).toBe('1');
    expect(city?.textContent).toBe('Rabat');
  });

  it('tells which row is being edited', () => {
    const { table } = setup();

    table.edit(1);

    expect(table.isEditing(1)).toBe(true);
    expect(table.isEditing(2)).toBe(false);
  });

  it('puts the original text back on cancel', () => {
    const { container, table } = setup();
    table.edit(1);

    table.cancel(1);

    expect(inputsIn(container)).toHaveLength(0);
    expect(rowCells(container, 1).map((td) => td.textContent)).toEqual([
      '1',
      'Name 1',
      '20',
      'Rabat',
      'Edit',
    ]);
    expect(table.isEditing(1)).toBe(false);
  });

  it('throws away typed changes on cancel', () => {
    const { container, table } = setup();
    table.edit(1);

    const [nameInput] = inputsIn(container);
    if (nameInput) nameInput.value = 'Changed';
    table.cancel(1);

    expect(rowCells(container, 1)[1]?.textContent).toBe('Name 1');
  });

  it('does nothing when cancelling a row that is not being edited', () => {
    const { table } = setup();

    expect(() => {
      table.cancel(1);
      table.cancel(99);
    }).not.toThrow();
  });

  it('returns false for a row that does not exist', () => {
    const { table } = setup();

    expect(table.edit(99)).toBe(false);
  });

  it('allows one row at a time', () => {
    const { container, table } = setup();
    table.edit(1);

    expect(table.edit(2)).toBe(false);
    expect(table.edit(1)).toBe(false);
    expect(rowCells(container, 2)[1]?.querySelector('input')).toBeNull();
  });

  it('can edit another row after cancelling', () => {
    const { table } = setup();
    table.edit(1);
    table.cancel(1);

    expect(table.edit(2)).toBe(true);
  });

  it('returns false for a row on a page that has not been shown yet', () => {
    const { container, table } = setup();

    expect(table.edit(15)).toBe(false);

    clickPage(container, 'next');

    expect(table.edit(15)).toBe(true);
  });

  it('keeps the editors and typed text when changing pages', () => {
    const { container, table } = setup();
    table.edit(1);
    const [nameInput] = inputsIn(container);
    if (nameInput) nameInput.value = 'Typed';

    clickPage(container, 'next');
    expect(inputsIn(container)).toHaveLength(0);

    clickPage(container, 'previous');
    expect(inputsIn(container)[0]).toBe(nameInput);
    expect(nameInput?.value).toBe('Typed');
  });

  it('destroys open editors on setData', () => {
    const { column, destroy } = trackedEditor();
    const { table } = setup([{ title: 'ID', prop: 'id' }, column]);
    table.edit(1);

    table.setData(rows);

    expect(destroy).toHaveBeenCalledOnce();
    expect(table.isEditing(1)).toBe(false);
  });

  it('destroys open editors on destroy', () => {
    const { column, destroy } = trackedEditor();
    const { table } = setup([{ title: 'ID', prop: 'id' }, column]);
    table.edit(1);

    table.destroy();

    expect(destroy).toHaveBeenCalledOnce();
  });

  it('needs rowId when a column has an editor', () => {
    const container = document.createElement('div');

    expect(
      () =>
        new Tadabut(container, {
          data: rows,
          columns: [{ title: 'Name', prop: 'name', editor: { type: 'text' } }],
        }),
    ).toThrow('rowId is required');
    expect(container.childElementCount).toBe(0);
  });

  it('does not need rowId when no column has an editor', () => {
    const container = document.createElement('div');

    const table = new Tadabut(container, {
      data: rows,
      columns: [{ title: 'Name', prop: 'name' }],
    });

    expect(table.edit(1)).toBe(false);
    table.destroy();
  });
});

describe("editing in 'multiple' mode", () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens several rows at once', () => {
    const { container, table } = setup(columns, { mode: 'multiple' });

    expect(table.edit(1)).toBe(true);
    expect(table.edit(2)).toBe(true);

    expect(table.isEditing(1)).toBe(true);
    expect(table.isEditing(2)).toBe(true);
    expect(inputsIn(container)).toHaveLength(4);
  });

  it('does not open the same row twice', () => {
    const { container, table } = setup(columns, { mode: 'multiple' });
    table.edit(1);

    expect(table.edit(1)).toBe(false);
    expect(inputsIn(container)).toHaveLength(2);
  });

  it('cancels one row without touching the other', () => {
    const { container, table } = setup(columns, { mode: 'multiple' });
    table.edit(1);
    table.edit(2);

    table.cancel(1);

    expect(table.isEditing(1)).toBe(false);
    expect(table.isEditing(2)).toBe(true);
    expect(rowCells(container, 1)[1]?.textContent).toBe('Name 1');
    expect(rowCells(container, 2)[1]?.querySelector('input')?.value).toBe('Name 2');
  });

  it('saves each row on its own', async () => {
    const { container, table } = setup(columns, { mode: 'multiple' });
    table.edit(1);
    table.edit(2);
    const input = rowCells(container, 2)[1]?.querySelector('input') as HTMLInputElement;
    input.value = 'Nadia';

    expect(await table.save(2)).toBe(true);

    expect(rowCells(container, 2)[1]?.textContent).toBe('Nadia');
    expect(table.isEditing(1)).toBe(true);
    expect(rowCells(container, 1)[1]?.querySelector('input')?.value).toBe('Name 1');
  });

  it('destroys every open row on setData', () => {
    const { container, table } = setup(columns, { mode: 'multiple' });
    table.edit(1);
    table.edit(2);

    table.setData(rows);

    expect(table.isEditing(1)).toBe(false);
    expect(table.isEditing(2)).toBe(false);
    expect(inputsIn(container)).toHaveLength(0);
  });
});
