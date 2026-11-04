import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Column, fr, Tadabut, type TadabutOptions } from '../../src/index';

type Row = { id: number; name: string };

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
];

const readOnly: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name' },
];

function rows(): Row[] {
  return [
    { id: 1, name: 'Amina' },
    { id: 2, name: 'Salma' },
    { id: 3, name: 'Karim' },
  ];
}

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    onDelete: () => {},
    ...options,
  });

  /** The data rows, without the error rows under them. */
  const dataRows = () =>
    [...container.querySelectorAll<HTMLTableRowElement>('tbody tr')].filter(
      (tr) => !tr.classList.contains('tdb-row-error'),
    );
  const firstRow = () => dataRows()[0] as HTMLTableRowElement;
  const ids = () => dataRows().map((tr) => tr.cells[0]?.textContent);
  /** What the first row's actions cell shows, one entry per element. */
  const actions = () =>
    [...(firstRow().querySelector('td.tdb-actions')?.children ?? [])].map((el) => el.textContent);
  const click = (action: string) =>
    (firstRow().querySelector(`[data-tdb-action="${action}"]`) as HTMLElement).click();
  const rowError = () => container.querySelector('.tdb-row-error-message')?.textContent;

  return { container, table, dataRows, firstRow, ids, actions, click, rowError };
}

/** An `onDelete` that waits until the test settles it. */
function waitingDelete() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const onDelete = vi.fn(
    () =>
      new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
      }),
  );

  return { onDelete, resolve: () => resolve(), reject: (e: unknown) => reject(e) };
}

/** Lets the promises started by a click finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the Delete button', () => {
  it('only shows with onDelete', () => {
    const { actions } = setup({ onDelete: undefined });

    expect(actions()).toEqual(['Edit']);
  });

  it('shows after Edit', () => {
    const { actions } = setup();

    expect(actions()).toEqual(['Edit', 'Delete']);
  });

  it('shows alone when no column has an editor', () => {
    const { actions } = setup({ columns: readOnly });

    expect(actions()).toEqual(['Delete']);
  });

  it('shows alone with editing.button off', () => {
    const { actions } = setup({ editing: { button: false } });

    expect(actions()).toEqual(['Delete']);
  });

  it('needs a rowId', () => {
    const container = document.createElement('div');

    expect(
      () => new Tadabut(container, { data: rows(), columns: readOnly, onDelete: () => {} }),
    ).toThrow('Tadabut: rowId is required with onDelete.');
  });

  it('is replaced by Save and Cancel while the row is edited, and comes back after', () => {
    const { table, actions } = setup();

    table.edit(1);
    expect(actions()).toEqual(['Save', 'Cancel']);

    table.cancel(1);
    expect(actions()).toEqual(['Edit', 'Delete']);
  });

  it('escapes its label', () => {
    const { firstRow } = setup({ texts: { delete: '<b>Bye</b>' } });
    const button = firstRow().querySelector('[data-tdb-action="delete"]') as HTMLElement;

    expect(button.querySelector('b')).toBeNull();
    expect(button.textContent).toBe('<b>Bye</b>');
  });
});

describe('asking before deleting', () => {
  it('asks in the row, with the focus on No', () => {
    const { actions, click } = setup();

    click('delete');

    expect(actions()).toEqual(['Delete this row?', 'Yes, delete', 'No']);
    expect(document.activeElement?.textContent).toBe('No');
  });

  it('puts the buttons back on No, without deleting', async () => {
    const onDelete = vi.fn();
    const { actions, click, ids } = setup({ onDelete });

    click('delete');
    click('keep');
    await settle();

    expect(actions()).toEqual(['Edit', 'Delete']);
    expect(onDelete).not.toHaveBeenCalled();
    expect(ids()).toEqual(['1', '2', '3']);
  });

  it('deletes on Yes', async () => {
    const onDelete = vi.fn();
    const { click, ids } = setup({ onDelete });

    click('delete');
    click('confirm');
    await settle();

    expect(onDelete).toHaveBeenCalledWith({ id: 1, name: 'Amina' });
    expect(ids()).toEqual(['2', '3']);
  });

  it('asks in French', () => {
    const { actions, click } = setup({ texts: fr });

    click('delete');

    expect(actions()).toEqual(['Supprimer cette ligne ?', 'Oui, supprimer', 'Non']);
  });

  it('deletes right away with confirmDelete: false', async () => {
    const { click, ids } = setup({ confirmDelete: false });

    click('delete');
    await settle();

    expect(ids()).toEqual(['2', '3']);
  });

  it('asks with your function instead, and keeps the row when it says no', async () => {
    const confirmDelete = vi.fn(() => false);
    const { actions, click, ids } = setup({ confirmDelete });

    click('delete');
    await settle();

    expect(confirmDelete).toHaveBeenCalledWith({ id: 1, name: 'Amina' });
    expect(actions()).toEqual(['Edit', 'Delete']);
    expect(ids()).toEqual(['1', '2', '3']);
  });

  it('waits for an async confirmDelete', async () => {
    const { click, ids } = setup({ confirmDelete: async () => true });

    click('delete');
    await settle();

    expect(ids()).toEqual(['2', '3']);
  });

  it('never asks when delete() is called from code', async () => {
    const confirmDelete = vi.fn(() => false);
    const { table, ids } = setup({ confirmDelete });

    await table.delete(1);

    expect(confirmDelete).not.toHaveBeenCalled();
    expect(ids()).toEqual(['2', '3']);
  });
});

describe('delete()', () => {
  it('removes the row and returns true', async () => {
    const { table, ids } = setup();

    expect(await table.delete(2)).toBe(true);
    expect(ids()).toEqual(['1', '3']);
  });

  it('stays on the same page', async () => {
    const { container, table } = setup({ dataTables: { pageLength: 1 } });
    const info = () => container.querySelector('.dt-info')?.textContent;
    container.querySelector<HTMLElement>('.dt-paging [data-dt-idx="1"]')?.click();
    expect(info()).toContain('2 to 2');

    await table.delete(3);

    expect(info()).toContain('2 to 2 of 2');
  });

  it('works without onDelete', async () => {
    const { table, ids } = setup({ onDelete: undefined });

    expect(await table.delete(1)).toBe(true);
    expect(ids()).toEqual(['2', '3']);
  });

  it('returns false for a row that does not exist', async () => {
    const onDelete = vi.fn();
    const { table } = setup({ onDelete });

    expect(await table.delete(99)).toBe(false);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('refuses a row that is being edited', async () => {
    const onDelete = vi.fn();
    const { table, ids } = setup({ onDelete });
    table.edit(1);

    expect(await table.delete(1)).toBe(false);
    expect(onDelete).not.toHaveBeenCalled();
    expect(ids()).toEqual(['1', '2', '3']);
  });

  it('locks the row while onDelete runs', async () => {
    const { onDelete, resolve } = waitingDelete();
    const { table, firstRow } = setup({ onDelete });

    const done = table.delete(1);

    expect(firstRow().inert).toBe(true);
    expect(firstRow().classList.contains('tdb-row-saving')).toBe(true);

    resolve();
    await done;
  });

  it('calls onDelete once when deleted twice', async () => {
    const { onDelete, resolve } = waitingDelete();
    const { table } = setup({ onDelete });

    const first = table.delete(1);
    const second = await table.delete(1);
    resolve();

    expect(second).toBe(false);
    expect(await first).toBe(true);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('cannot edit a row that is being deleted', async () => {
    const { onDelete, resolve } = waitingDelete();
    const { table } = setup({ onDelete });

    const done = table.delete(1);

    expect(table.edit(1)).toBe(false);

    resolve();
    await done;
  });

  it('keeps the row and shows the error when onDelete throws', async () => {
    const { table, firstRow, actions, ids, rowError } = setup({
      onDelete: async () => {
        throw new Error('Server says no');
      },
    });

    expect(await table.delete(1)).toBe(false);

    expect(ids()).toEqual(['1', '2', '3']);
    expect(rowError()).toBe('Server says no');
    expect(firstRow().inert).toBe(false);
    expect(actions()).toEqual(['Edit', 'Delete']);
  });

  it('takes the question away when onDelete throws after Yes', async () => {
    const { click, actions, rowError } = setup({
      onDelete: async () => {
        throw new Error('Server says no');
      },
    });

    click('delete');
    click('confirm');
    await settle();

    expect(actions()).toEqual(['Edit', 'Delete']);
    expect(rowError()).toBe('Server says no');
  });

  it('shows deleteFailed when onDelete throws something that is not an Error', async () => {
    const { table, rowError } = setup({
      onDelete: () => {
        throw 'nope';
      },
    });

    await table.delete(1);

    expect(rowError()).toBe('Could not delete.');
  });

  it('clears the old error on the next try', async () => {
    let fail = true;
    const { table, container } = setup({
      onDelete: () => {
        if (fail) {
          throw new Error('Server says no');
        }
      },
    });
    await table.delete(1);
    fail = false;

    await table.delete(1);

    expect(container.querySelector('.tdb-row-error')).toBeNull();
  });

  it('can still be edited after a failed delete', async () => {
    const { table } = setup({
      onDelete: () => {
        throw new Error('Server says no');
      },
    });
    await table.delete(1);

    expect(table.edit(1)).toBe(true);
  });

  it('leaves new rows alone when setData runs while onDelete waits', async () => {
    const { onDelete, resolve } = waitingDelete();
    const { table, ids } = setup({ onDelete });

    const done = table.delete(1);
    table.setData([{ id: 1, name: 'Nadia' }]);
    resolve();

    expect(await done).toBe(false);
    expect(ids()).toEqual(['1']);
  });

  it('does not throw when the table is destroyed while onDelete waits', async () => {
    const { onDelete, reject } = waitingDelete();
    const { table } = setup({ onDelete });

    const done = table.delete(1);
    table.destroy();
    reject(new Error('too late'));

    expect(await done).toBe(false);
  });
});
