import { afterEach, describe, expect, it } from 'vitest';

import { type Column, Tadabut } from '../../src/index';

const rows = [
  { id: 1, name: 'Amina', city: 'Rabat' },
  { id: 2, name: 'Youness', city: 'Casablanca' },
  { id: 3, name: 'Salma', city: 'Agadir' },
];

type Row = (typeof rows)[number];

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name' },
  { title: 'City', prop: 'city' },
];

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

function namesShown(container: HTMLElement): string[] {
  return [...container.querySelectorAll('tbody tr td:nth-child(2)')].map(
    (td) => td.textContent ?? '',
  );
}

function searchFor(container: HTMLElement, text: string): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="search"]');

  if (!input) {
    throw new Error('No search input found');
  }

  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return input;
}

async function clickHeader(container: HTMLElement, title: string): Promise<void> {
  const header = [...container.querySelectorAll<HTMLElement>('thead th')].find(
    (th) => th.textContent === title,
  );

  if (!header) {
    throw new Error(`No header named ${title}`);
  }

  header.click();

  await new Promise((resolve) => setTimeout(resolve, 0));
}

function clickNextPage(container: HTMLElement): void {
  container.querySelector<HTMLButtonElement>('button[data-dt-idx="next"]')?.click();
}

function info(container: HTMLElement): string {
  return container.querySelector('.dt-info')?.textContent ?? '';
}

function manyRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Name ${String(i + 1).padStart(2, '0')}`,
    city: 'Rabat',
  }));
}

describe('Tadabut', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows one row per item', () => {
    const container = createContainer();
    const table = new Tadabut(container, { data: rows, columns });

    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);

    table.destroy();
  });

  it('reads each cell from the column prop', () => {
    const container = createContainer();
    const table = new Tadabut(container, { data: rows, columns });

    const firstRow = container.querySelector('tbody tr');
    const cells = [...(firstRow?.querySelectorAll('td') ?? [])].map((td) => td.textContent);

    expect(cells).toEqual(['1', 'Amina', 'Rabat']);

    table.destroy();
  });

  it('uses the column titles as headers', () => {
    const container = createContainer();
    const table = new Tadabut(container, { data: rows, columns });

    const headers = [...container.querySelectorAll('thead th')].map((th) => th.textContent);

    expect(headers).toEqual(['ID', 'Name', 'City']);

    table.destroy();
  });

  it('leaves the container empty after destroy', () => {
    const container = createContainer();
    const table = new Tadabut(container, { data: rows, columns });

    table.destroy();

    expect(container.childElementCount).toBe(0);
  });

  describe('setData', () => {
    it('replaces the rows', () => {
      const container = createContainer();
      const table = new Tadabut(container, { data: rows, columns });

      table.setData([
        { id: 4, name: 'Karim', city: 'Fès' },
        { id: 5, name: 'Nadia', city: 'Tanger' },
      ]);

      expect(namesShown(container)).toEqual(['Karim', 'Nadia']);

      table.destroy();
    });

    it('keeps the search', () => {
      const container = createContainer();
      const table = new Tadabut(container, { data: rows, columns });

      const input = searchFor(container, 'Amina');
      expect(namesShown(container)).toEqual(['Amina']);

      table.setData([
        ...rows,
        { id: 4, name: 'Aminata', city: 'Fès' },
        { id: 5, name: 'Nadia', city: 'Tanger' },
      ]);

      expect(input.value).toBe('Amina');
      expect(namesShown(container)).toEqual(['Amina', 'Aminata']);

      table.destroy();
    });

    it('keeps the sorting', async () => {
      const container = createContainer();
      const table = new Tadabut(container, { data: rows, columns });

      await clickHeader(container, 'Name');
      await clickHeader(container, 'Name');
      expect(namesShown(container)).toEqual(['Youness', 'Salma', 'Amina']);

      table.setData([...rows, { id: 4, name: 'Karim', city: 'Fès' }]);

      expect(namesShown(container)).toEqual(['Youness', 'Salma', 'Karim', 'Amina']);

      table.destroy();
    });

    it('keeps the current page', () => {
      const container = createContainer();
      const table = new Tadabut(container, { data: manyRows(25), columns });

      clickNextPage(container);
      expect(info(container)).toContain('11 to 20 of 25');

      table.setData(manyRows(30));

      expect(info(container)).toContain('11 to 20 of 30');

      table.destroy();
    });
  });
});
