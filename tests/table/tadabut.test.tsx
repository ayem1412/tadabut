import { act, createRef, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Column } from '../../src/index';
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

/** Renders with any props. `columns` defaults to the editable ones. */
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
    expect(() => handle.cancel(1)).not.toThrow();
  });

  it('calls the latest onSave without rebuilding the table', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const ref = createRef<TadabutHandle<Row>>();
    await renderWith({ ref, onSave: (row) => first(row) });
    const table = container.querySelector('table');

    // A new inline function, like on every real render.
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
});
