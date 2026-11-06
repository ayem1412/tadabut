import { act, createRef, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Column, fr } from '../../src/index';
import { Tadabut, type TadabutHandle, type TadabutProps } from '../../src/react/index';

type Row = { id: number; name: string; city: string };

const rows: Row[] = [
  { id: 1, name: 'Amina', city: 'Rabat' },
  { id: 2, name: 'Youness', city: 'Casablanca' },
  { id: 3, name: 'Salma', city: 'Agadir' },
];

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name' },
];

const columnsWithCity: Column<Row>[] = [...columns, { title: 'City', prop: 'city' }];

let container: HTMLDivElement;
let root: Root;

async function render(data: readonly Row[], tableColumns: Column<Row>[] = columns): Promise<void> {
  await act(async () => {
    root.render(
      <StrictMode>
        <Tadabut data={data} columns={tableColumns} rowId='id' />
      </StrictMode>,
    );
  });
}

function namesShown(): string[] {
  return [...container.querySelectorAll('tbody tr td:nth-child(2)')].map(
    (td) => td.textContent ?? '',
  );
}

describe('React Tadabut', () => {
  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
  });

  it('leaves exactly one table under StrictMode', async () => {
    await render(rows);

    expect(container.querySelectorAll('table')).toHaveLength(1);
  });

  it('updates the rows without rebuilding the table', async () => {
    await render(rows);
    const table = container.querySelector('table');

    await render([
      { id: 4, name: 'Karim', city: 'Fès' },
      { id: 5, name: 'Nadia', city: 'Tanger' },
    ]);

    expect(namesShown()).toEqual(['Karim', 'Nadia']);
    expect(container.querySelector('table')).toBe(table);
  });

  it('rebuilds with the latest data when columns change', async () => {
    const karim: Row[] = [{ id: 4, name: 'Karim', city: 'Fès' }];
    await render(rows);
    await render(karim);

    await render(karim, columnsWithCity);

    expect(container.querySelectorAll('thead th')).toHaveLength(3);
    expect(namesShown()).toEqual(['Karim']);
  });

  it('leaves the container empty after unmount', async () => {
    await render(rows);

    await act(async () => {
      root.unmount();
    });

    expect(container.childElementCount).toBe(0);
  });
});

const editable: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
];

async function renderWith(props: Partial<TadabutProps<Row>>): Promise<void> {
  await act(async () => {
    root.render(
      <StrictMode>
        <Tadabut data={rows} columns={editable} rowId='id' {...props} />
      </StrictMode>,
    );
  });
}

function nameInput(): HTMLInputElement {
  return container.querySelector('tbody input') as HTMLInputElement;
}

describe('React Tadabut editing', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
  });

  it('gives the ref the editing methods', async () => {
    const ref = createRef<TadabutHandle<Row>>();
    await renderWith({ ref });

    let started = false;
    act(() => {
      started = ref.current?.edit(1) ?? false;
    });

    expect(started).toBe(true);
    expect(ref.current?.isEditing(1)).toBe(true);
    expect(nameInput().value).toBe('Amina');

    act(() => ref.current?.cancel(1));

    expect(ref.current?.isEditing(1)).toBe(false);
  });

  it('saves through the ref', async () => {
    const ref = createRef<TadabutHandle<Row>>();
    await renderWith({ ref });
    act(() => {
      ref.current?.edit(1);
    });
    nameInput().value = 'Nadia';

    let saved = false;
    await act(async () => {
      saved = (await ref.current?.save(1)) ?? false;
    });

    expect(saved).toBe(true);
    expect(namesShown()[0]).toBe('Nadia');
  });

  it('returns false from the ref once the table is gone', async () => {
    const ref = createRef<TadabutHandle<Row>>();
    await renderWith({ ref });
    const handle = ref.current as TadabutHandle<Row>;

    await act(async () => {
      root.unmount();
    });
    // The afterEach unmounts again: give it a fresh root.
    root = createRoot(container);

    expect(handle.edit(1)).toBe(false);
    expect(handle.isEditing(1)).toBe(false);
    expect(await handle.save(1)).toBe(false);
    expect(await handle.delete(1)).toBe(false);
    expect(handle.add()).toBe(false);
    expect(handle.isAdding()).toBe(false);
    expect(await handle.saveNew()).toBe(false);
    handle.cancelNew();
    expect(() => handle.cancel(1)).not.toThrow();
  });

  it('calls the latest onSave without rebuilding the table', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const ref = createRef<TadabutHandle<Row>>();
    await renderWith({ ref, onSave: (row) => first(row) });
    const table = container.querySelector('table');

    await renderWith({ ref, onSave: (row) => second(row) });
    act(() => {
      ref.current?.edit(1);
    });
    await act(async () => {
      await ref.current?.save(1);
    });

    expect(container.querySelector('table')).toBe(table);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(rows[0]);
  });

  it('keeps the table and the open row when editing has the same values', async () => {
    const ref = createRef<TadabutHandle<Row>>();
    await renderWith({ ref, editing: { mode: 'multiple' } });
    const table = container.querySelector('table');
    act(() => {
      ref.current?.edit(1);
    });

    await renderWith({ ref, editing: { mode: 'multiple' } });

    expect(container.querySelector('table')).toBe(table);
    expect(ref.current?.isEditing(1)).toBe(true);
  });

  it('rebuilds the table when the editing mode changes', async () => {
    const ref = createRef<TadabutHandle<Row>>();
    await renderWith({ ref });
    const table = container.querySelector('table');

    await renderWith({ ref, editing: { mode: 'multiple' } });

    expect(container.querySelector('table')).not.toBe(table);
    act(() => {
      ref.current?.edit(1);
      ref.current?.edit(2);
    });
    expect(ref.current?.isEditing(2)).toBe(true);
  });

  it('passes button: false to the table', async () => {
    await renderWith({ editing: { button: false } });

    expect(container.querySelectorAll('tbody button')).toHaveLength(0);
  });

  it('passes classNames to the table', async () => {
    await renderWith({ classNames: { table: 'table', save: 'btn-primary' } });

    expect(container.querySelector('table')?.classList.contains('table')).toBe(true);
  });

  it('keeps the table when classNames is a new object with the same values', async () => {
    await renderWith({ classNames: { table: 'table' } });
    const table = container.querySelector('table');

    await renderWith({ classNames: { table: 'table' } });

    expect(container.querySelector('table')).toBe(table);
  });

  it('rebuilds the table when a classNames value changes', async () => {
    await renderWith({ classNames: { table: 'table' } });
    const table = container.querySelector('table');

    await renderWith({ classNames: { table: 'table table-dark' } });

    const rebuilt = container.querySelector('table');
    expect(rebuilt).not.toBe(table);
    expect(rebuilt?.classList.contains('table-dark')).toBe(true);
  });

  it('passes the button classes too', async () => {
    const ref = createRef<TadabutHandle<Row>>();
    await renderWith({ ref, classNames: { button: 'btn', save: 'btn-primary' } });

    act(() => {
      ref.current?.edit(1);
    });

    const save = container.querySelector('[data-tdb-action="save"]');
    expect(save?.className).toBe('tdb-button tdb-button-save btn btn-primary');
  });

  it('passes dataTables to the table', async () => {
    await renderWith({ dataTables: { pageLength: 2 } });

    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('keeps the table when dataTables is the same object', async () => {
    const settings = { pageLength: 2 };
    await renderWith({ dataTables: settings });
    const table = container.querySelector('table');

    await renderWith({ dataTables: settings });

    expect(container.querySelector('table')).toBe(table);
  });

  it('rebuilds the table when dataTables is a new object', async () => {
    await renderWith({ dataTables: { pageLength: 2 } });
    const table = container.querySelector('table');

    await renderWith({ dataTables: { pageLength: 2 } });

    expect(container.querySelector('table')).not.toBe(table);
  });

  it('passes texts to the table', async () => {
    await renderWith({ texts: fr });

    expect(container.querySelector('[data-tdb-action="edit"]')?.textContent).toBe('Modifier');
  });
});

/** Clicks an action button in the first row. */
function clickAction(action: string): void {
  act(() => {
    container
      .querySelector<HTMLElement>(`tbody tr:first-child [data-tdb-action="${action}"]`)
      ?.click();
  });
}

describe('React Tadabut deleting', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
  });

  it('shows the Delete button with onDelete, and deletes on Yes', async () => {
    const onDelete = vi.fn();
    await renderWith({ onDelete });

    clickAction('delete');
    await act(async () => {
      clickAction('confirm');
    });

    expect(onDelete).toHaveBeenCalledWith(rows[0]);
    expect(namesShown()).toEqual(['Youness', 'Salma']);
  });

  it('adds the Delete button when onDelete is added later', async () => {
    await renderWith({});
    expect(container.querySelector('[data-tdb-action="delete"]')).toBeNull();

    await renderWith({ onDelete: () => {} });

    expect(container.querySelector('[data-tdb-action="delete"]')).not.toBeNull();
  });

  it('keeps the question open when onDelete is a new function', async () => {
    await renderWith({ onDelete: () => {} });
    const table = container.querySelector('table');
    clickAction('delete');

    await renderWith({ onDelete: () => {} });

    expect(container.querySelector('table')).toBe(table);
    expect(container.querySelector('.tdb-delete-question')).not.toBeNull();
  });

  it('calls the latest onDelete and confirmDelete', async () => {
    const first = vi.fn();
    const second = vi.fn();
    await renderWith({ onDelete: first, confirmDelete: () => false });
    await renderWith({ onDelete: second, confirmDelete: () => true });

    await act(async () => {
      clickAction('delete');
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(rows[0]);
  });

  it('deletes right away with confirmDelete: false', async () => {
    await renderWith({ onDelete: () => {}, confirmDelete: false });

    await act(async () => {
      clickAction('delete');
    });

    expect(namesShown()).toEqual(['Youness', 'Salma']);
  });

  it('deletes through the ref', async () => {
    const ref = createRef<TadabutHandle<Row>>();
    await renderWith({ ref });

    let deleted = false;
    await act(async () => {
      deleted = (await ref.current?.delete(2)) ?? false;
    });

    expect(deleted).toBe(true);
    expect(namesShown()).toEqual(['Amina', 'Salma']);
  });

  it('passes the delete classes to the table', async () => {
    await renderWith({
      onDelete: () => {},
      classNames: { delete: 'btn-outline-danger', confirm: 'btn-danger', keep: 'btn-light' },
    });

    expect(
      container.querySelector('.tdb-button-delete')?.classList.contains('btn-outline-danger'),
    ).toBe(true);

    clickAction('delete');

    expect(container.querySelector('.tdb-button-confirm')?.classList.contains('btn-danger')).toBe(
      true,
    );
    expect(container.querySelector('.tdb-button-keep')?.classList.contains('btn-light')).toBe(true);
  });
});

/** Types into the new row's Name input. */
function typeNewName(value: string): void {
  const input = container.querySelector('tr.tdb-row-new input') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('React Tadabut adding', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
  });

  it('adds a row through the ref', async () => {
    const ref = createRef<TadabutHandle<Row>>();
    const onAdd = vi.fn((row: Partial<Row>) => ({ ...row, id: 4, city: '' }) as Row);
    await renderWith({ ref, onAdd });

    act(() => {
      ref.current?.add();
    });
    expect(ref.current?.isAdding()).toBe(true);
    typeNewName('Nadia');

    let added = false;
    await act(async () => {
      added = (await ref.current?.saveNew()) ?? false;
    });

    expect(added).toBe(true);
    expect(onAdd).toHaveBeenCalledWith({ name: 'Nadia' });
    expect(namesShown()).toContain('Nadia');
    expect(ref.current?.isAdding()).toBe(false);
  });

  it('cancels the new row through the ref', async () => {
    const ref = createRef<TadabutHandle<Row>>();
    await renderWith({ ref });

    act(() => {
      ref.current?.add();
      ref.current?.cancelNew();
    });

    expect(container.querySelector('.tdb-new-rows')).toBeNull();
  });

  it('keeps the new row open when onAdd is a new function', async () => {
    const ref = createRef<TadabutHandle<Row>>();
    await renderWith({ ref, onAdd: () => {} });
    act(() => {
      ref.current?.add();
    });

    await renderWith({ ref, onAdd: () => {} });

    expect(ref.current?.isAdding()).toBe(true);
  });

  it('calls the latest onAdd', async () => {
    const ref = createRef<TadabutHandle<Row>>();
    const first = vi.fn();
    const second = vi.fn((row: Partial<Row>) => ({ ...row, id: 4, city: '' }) as Row);
    await renderWith({ ref, onAdd: first });
    await renderWith({ ref, onAdd: second });

    act(() => {
      ref.current?.add();
    });
    typeNewName('Nadia');
    await act(async () => {
      await ref.current?.saveNew();
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });
});
