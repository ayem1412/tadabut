import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Column, type SaveContext, Tadabut, type TadabutOptions } from '../../src/index';

type Row = { id: number; name: string; age: number };

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text', required: true } },
  { title: 'Age', prop: 'age', editor: { type: 'number' } },
];

function rows(): Row[] {
  return [
    { id: 1, name: 'Amina', age: 20 },
    { id: 2, name: 'Salma', age: 30 },
  ];
}

function setup(onSave?: TadabutOptions<Row>['onSave']) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    onSave,
  });

  const firstRow = () =>
    container.querySelector<HTMLTableRowElement>('tbody tr') as HTMLTableRowElement;
  const cellTexts = () => [...firstRow().querySelectorAll('td')].map((td) => td.textContent);
  const nameInput = () =>
    firstRow().querySelector<HTMLInputElement>('td:nth-child(2) input') as HTMLInputElement;
  const saveError = () => container.querySelector('.tdb-save-error');

  return { container, table, firstRow, cellTexts, nameInput, saveError };
}

function waitingSave() {
  let resolve!: (row?: Row) => void;
  let reject!: (error: unknown) => void;
  const onSave = vi.fn(
    () =>
      new Promise<Row | undefined>((res, rej) => {
        resolve = res;
        reject = rej;
      }),
  );

  return { onSave, resolve: (row?: Row) => resolve(row), reject: (e: unknown) => reject(e) };
}

describe('saving a row', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('calls onSave with the edited row and the previous one', async () => {
    const onSave = vi.fn(async (_row: Row, _context: SaveContext<Row>) => {});
    const { table, cellTexts, nameInput } = setup(onSave);
    table.edit(1);
    nameInput().value = 'Nadia';

    expect(await table.save(1)).toBe(true);

    expect(onSave).toHaveBeenCalledWith(
      { id: 1, name: 'Nadia', age: 20 },
      { previous: { id: 1, name: 'Amina', age: 20 } },
    );
    expect(cellTexts()).toEqual(['1', 'Nadia', '20']);
    expect(table.isEditing(1)).toBe(false);
  });

  it('shows the row returned by onSave', async () => {
    const { table, cellTexts } = setup(async (row) => ({ ...row, name: 'Server' }));
    table.edit(1);

    await table.save(1);

    expect(cellTexts()[1]).toBe('Server');
  });

  it('saves without onSave', async () => {
    const { table, cellTexts, nameInput } = setup();
    table.edit(1);
    nameInput().value = 'Karim';

    expect(await table.save(1)).toBe(true);
    expect(cellTexts()[1]).toBe('Karim');
  });

  it('does not save when a field is invalid', async () => {
    const onSave = vi.fn();
    const { container, table, nameInput } = setup(onSave);
    table.edit(1);
    nameInput().value = '';

    expect(await table.save(1)).toBe(false);

    expect(onSave).not.toHaveBeenCalled();
    expect(container.querySelector('.tdb-error')?.textContent).toBe('This field is required.');
    expect(nameInput().getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(nameInput());
    expect(table.isEditing(1)).toBe(true);
  });

  it('clears the errors once the field is fixed', async () => {
    const { container, table, nameInput } = setup();
    table.edit(1);
    nameInput().value = '';
    await table.save(1);

    nameInput().value = 'Fixed';

    expect(await table.save(1)).toBe(true);
    expect(container.querySelector('.tdb-error')).toBeNull();
  });

  it('keeps the row open with the typed values when onSave throws', async () => {
    const { table, nameInput, saveError } = setup(async () => {
      throw new Error('The server said no');
    });
    table.edit(1);
    nameInput().value = 'Typed';

    expect(await table.save(1)).toBe(false);

    expect(table.isEditing(1)).toBe(true);
    expect(nameInput().value).toBe('Typed');
    expect(saveError()?.textContent).toBe('The server said no');
  });

  it('shows a default message when onSave throws something else', async () => {
    const { table, saveError } = setup(async () => {
      throw 'oops';
    });
    table.edit(1);

    await table.save(1);

    expect(saveError()?.textContent).toBe('Could not save.');
  });

  it('shows the error as text, never as HTML', async () => {
    const { container, table, saveError } = setup(async () => {
      throw new Error('<img src=x>');
    });
    table.edit(1);

    await table.save(1);

    expect(saveError()?.textContent).toBe('<img src=x>');
    expect(container.querySelector('img')).toBeNull();
  });

  it('locks the row while saving', async () => {
    const { onSave, resolve } = waitingSave();
    const { table, firstRow } = setup(onSave);
    table.edit(1);

    const saving = table.save(1);

    expect(firstRow().inert).toBe(true);
    expect(firstRow().classList.contains('tdb-row-saving')).toBe(true);
    expect(await table.save(1)).toBe(false);

    table.cancel(1);
    expect(table.isEditing(1)).toBe(true);

    resolve();
    expect(await saving).toBe(true);
    expect(onSave).toHaveBeenCalledOnce();
    expect(firstRow().inert).toBe(false);
    expect(firstRow().classList.contains('tdb-row-saving')).toBe(false);
  });

  it('unlocks the row after a failed save, and cancel clears the error', async () => {
    const { onSave, reject } = waitingSave();
    const { table, firstRow, saveError } = setup(onSave);
    table.edit(1);

    const saving = table.save(1);
    reject(new Error('No'));
    await saving;

    expect(firstRow().inert).toBe(false);
    expect(firstRow().classList.contains('tdb-row-saving')).toBe(false);

    table.cancel(1);

    expect(table.isEditing(1)).toBe(false);
    expect(saveError()).toBeNull();
  });

  it('ignores a save that finishes after setData', async () => {
    const { onSave, reject } = waitingSave();
    const { table, saveError } = setup(onSave);
    table.edit(1);

    const saving = table.save(1);
    table.setData(rows());
    reject(new Error('Too late'));

    expect(await saving).toBe(false);
    expect(saveError()).toBeNull();
  });

  it('keeps its own copy of the saved row', async () => {
    const returned: Row = { id: 1, name: 'Server', age: 20 };
    const { table, cellTexts } = setup(async () => returned);
    table.edit(1);
    await table.save(1);

    returned.name = 'Changed later';
    table.edit(1);
    table.cancel(1);

    expect(cellTexts()[1]).toBe('Server');
  });

  it('returns false for a row that is not being edited', async () => {
    const { table } = setup();

    expect(await table.save(1)).toBe(false);
  });
});
