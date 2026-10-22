import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Column } from '../../src/index';
import { Tadabut } from '../../src/react/index';

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
