import { afterEach, describe, expect, it } from 'vitest';

import { Tadabut } from '../src/index';

const rows = [
  { id: 1, name: 'Amina', city: 'Rabat' },
  { id: 2, name: 'Youness', city: 'Casablanca' },
  { id: 3, name: 'Salma', city: 'Agadir' },
];

const columns = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name' },
  { title: 'City', prop: 'city' },
];

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

describe('Tadabut', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows one row per item', () => {
    const container = createContainer();
    const table = new Tadabut(container, rows, columns);

    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);

    table.destroy();
  });

  it('reads each cell from the column prop', () => {
    const container = createContainer();
    const table = new Tadabut(container, rows, columns);

    const firstRow = container.querySelector('tbody tr');
    const cells = [...(firstRow?.querySelectorAll('td') ?? [])].map((td) => td.textContent);

    expect(cells).toEqual(['1', 'Amina', 'Rabat']);

    table.destroy();
  });

  it('uses the column titles as headers', () => {
    const container = createContainer();
    const table = new Tadabut(container, rows, columns);

    const headers = [...container.querySelectorAll('thead th')].map((th) => th.textContent);

    expect(headers).toEqual(['ID', 'Name', 'City']);

    table.destroy();
  });

  it('leaves the container empty after destroy', () => {
    const container = createContainer();
    const table = new Tadabut(container, rows, columns);

    table.destroy();

    expect(container.childElementCount).toBe(0);
  });
});
