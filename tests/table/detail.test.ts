import { describe, expect, it, vi } from 'vitest';

import { type Column, fr, Tadabut, type TadabutOptions } from '../../src/index';
import { goToPage, mountPoint, search, settle, type, waiting } from '../helpers';

type Row = { id: number; name: string; total: number };

/** 12 rows: ids 1 to 12, so there are 2 pages of 10. */
function rows(): Row[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `N${String(i + 1).padStart(2, '0')}`,
    total: i + 1,
  }));
}

const columns: Column<Row>[] = [
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
  { title: 'Total', prop: 'total', total: 'sum' },
];

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    detail: (row) => `About ${row.name}`,
    // Keep the rows in data order.
    dataTables: { order: [] },
    ...options,
  });

  /** The ▸ button of a row on the page shown, from 0. */
  const button = (index = 0) =>
    container.querySelectorAll<HTMLButtonElement>('tbody .tdb-detail-toggle')[
      index
    ] as HTMLButtonElement;
  /** The text of every line under a row, detail or error, top to bottom. */
  const lines = () =>
    [...container.querySelectorAll('tr.tdb-row-detail, tr.tdb-row-error')].map(
      (tr) => `${tr.className}: ${tr.textContent}`,
    );

  return {
    container,
    table,
    button,
    lines,
    search: (text: string) => search(container, text),
    goToPage: (index: number) => goToPage(container, index),
  };
}

/** A `detail` that waits for `resolve`, and remembers the signal it was given. */
function slowDetail() {
  const load = waiting<string>();
  let signal: AbortSignal | undefined;

  return {
    detail: (_row: Row, context: { signal: AbortSignal }) => {
      signal = context.signal;
      return load.fn();
    },
    resolve: load.resolve,
    /** The signal of the last call. */
    signal: () => signal as AbortSignal,
  };
}

describe('the ▸ column', () => {
  it('only exists with detail', () => {
    const { container } = setup({ detail: undefined });

    expect(container.querySelector('.tdb-detail-toggle')).toBeNull();
  });

  it('comes after the checkboxes, closed, with a label', () => {
    const { container, button } = setup({ selection: true });
    const cells = container.querySelector('tbody tr')?.children;

    expect(cells?.[0]?.classList.contains('tdb-select')).toBe(true);
    expect(cells?.[1]?.classList.contains('tdb-detail')).toBe(true);
    expect(button().textContent).toBe('▸');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(button().getAttribute('aria-label')).toBe('Show details');
  });

  it('translates the labels', async () => {
    const { button } = setup({ texts: fr });

    expect(button().getAttribute('aria-label')).toBe('Afficher les détails');

    button().click();
    await settle();

    expect(button().getAttribute('aria-label')).toBe('Masquer les détails');
  });

  it('adds the detail class to the buttons', () => {
    const { container } = setup({ classNames: { detail: 'btn btn-sm' } });

    expect(container.querySelector('.tdb-detail-toggle')?.classList.contains('btn')).toBe(true);
  });

  it('keeps your order and the footer in place', () => {
    const { container } = setup({ dataTables: { order: [[1, 'desc']] } });

    expect(container.querySelector('tbody td:nth-child(2)')?.textContent).toBe('N12');
    // Empty under ▸, then the label, then the total.
    expect([...container.querySelectorAll('tfoot th')].map((th) => th.textContent)).toEqual([
      '',
      'Total',
      '78',
      '',
    ]);
  });

  it('gives the new row an empty cell under it', () => {
    const { table, container } = setup();

    table.add();

    expect(container.querySelector('.tdb-row-new td')?.childElementCount).toBe(0);
    expect(container.querySelector('.tdb-row-new')?.children).toHaveLength(4);
  });

  it('throws without rowId', () => {
    expect(
      () =>
        new Tadabut(mountPoint(), {
          data: rows(),
          columns: [{ title: 'Name', prop: 'name' }],
          detail: () => '',
        }),
    ).toThrow('rowId is required with detail');
  });
});

describe('opening and closing', () => {
  it('opens and closes with the button', async () => {
    const { button, lines, container } = setup();

    button().click();
    await settle();

    expect(lines()).toEqual(['tdb-row-detail: About N01']);
    expect(button().textContent).toBe('▾');
    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('tbody tr')?.classList.contains('tdb-detail-open')).toBe(true);

    button().click();

    expect(lines()).toEqual([]);
    expect(button().textContent).toBe('▸');
    expect(container.querySelector('tbody tr')?.classList.contains('tdb-detail-open')).toBe(false);
  });

  it('opens several at once', async () => {
    const { button, lines } = setup();

    button(0).click();
    button(2).click();
    await settle();

    expect(lines()).toEqual(['tdb-row-detail: About N01', 'tdb-row-detail: About N03']);
  });

  it('spans the whole table', async () => {
    const { button, container } = setup({ onDelete: () => {} });

    button().click();
    await settle();

    // ▸, Name, Total and the buttons.
    expect(container.querySelector<HTMLTableCellElement>('tr.tdb-row-detail td')?.colSpan).toBe(4);
  });

  it('works from code', async () => {
    const { table, lines } = setup();

    table.openDetail(2);
    await settle();

    expect(table.isDetailOpen(2)).toBe(true);
    expect(lines()).toEqual(['tdb-row-detail: About N02']);

    table.toggleDetail(2);

    expect(table.isDetailOpen(2)).toBe(false);

    table.toggleDetail(2);
    table.closeDetail(2);

    expect(lines()).toEqual([]);
  });

  it('does nothing without detail, or for a row that is not there', () => {
    const { table } = setup({ detail: undefined });

    table.openDetail(1);

    expect(table.isDetailOpen(1)).toBe(false);

    const other = setup();
    other.table.openDetail(99);

    expect(other.table.isDetailOpen(99)).toBe(false);
  });

  it("doesn't count as a row click", () => {
    const onRowClick = vi.fn();
    const { button, container } = setup({ onRowClick });

    button().click();
    container.querySelector<HTMLElement>('td.tdb-detail')?.click();

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('can be opened by a row click', async () => {
    const { table, container, lines } = setup({ onRowClick: (row) => table.toggleDetail(row.id) });

    container.querySelector<HTMLElement>('tbody td:nth-child(2)')?.click();
    await settle();

    expect(lines()).toEqual(['tdb-row-detail: About N01']);
  });

  it('ignores clicks inside it', async () => {
    const onRowClick = vi.fn();
    const { button, container } = setup({ onRowClick });

    button().click();
    await settle();
    container.querySelector<HTMLElement>('tr.tdb-row-detail td')?.click();

    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe('what it shows', () => {
  it('shows text as text, never as HTML', async () => {
    const { button, container } = setup({ detail: () => '<b>bold</b>' });

    button().click();
    await settle();

    expect(container.querySelector('tr.tdb-row-detail b')).toBeNull();
    expect(container.querySelector('tr.tdb-row-detail')?.textContent).toBe('<b>bold</b>');
  });

  it('shows an element', async () => {
    const { button, container } = setup({
      detail: (row) => Object.assign(document.createElement('strong'), { textContent: row.name }),
    });

    button().click();
    await settle();

    expect(container.querySelector('tr.tdb-row-detail strong')?.textContent).toBe('N01');
  });

  it('shows Loading… until an async detail returns', async () => {
    const load = slowDetail();
    const { button, lines } = setup({ detail: load.detail });

    button().click();

    expect(lines()).toEqual(['tdb-row-detail: Loading…']);

    load.resolve('Loaded');
    await settle();

    expect(lines()).toEqual(['tdb-row-detail: Loaded']);
  });

  it('shows the error when it throws', async () => {
    const { button, container } = setup({
      detail: async () => {
        throw new Error('No details');
      },
    });

    button().click();
    await settle();

    expect(container.querySelector('tr.tdb-row-detail .tdb-row-error-message')?.textContent).toBe(
      'No details',
    );
  });

  it('shows detailFailed when it throws something else', async () => {
    const { button, lines } = setup({
      detail: () => Promise.reject('nope'),
    });

    button().click();
    await settle();

    expect(lines()).toEqual(["tdb-row-detail: Couldn't load the details."]);
  });

  it('aborts the signal when closed while loading, and ignores the result', async () => {
    const load = slowDetail();
    const { table, lines } = setup({ detail: load.detail });

    table.openDetail(1);
    table.closeDetail(1);

    expect(load.signal().aborted).toBe(true);

    load.resolve('Too late');
    await settle();

    expect(lines()).toEqual([]);
  });
});

describe('when the table changes', () => {
  it('stays open across pages', async () => {
    const { button, lines, goToPage } = setup();

    button().click();
    await settle();
    goToPage(1);

    expect(lines()).toEqual([]);

    goToPage(0);

    expect(lines()).toEqual(['tdb-row-detail: About N01']);
    expect(button().textContent).toBe('▾');
  });

  it('stays open across a search', async () => {
    const { button, lines, search } = setup();

    button().click();
    await settle();
    search('N02');
    search('');

    expect(lines()).toEqual(['tdb-row-detail: About N01']);
  });

  it('stays open while editing and after cancel', async () => {
    const { table, button, lines } = setup();

    table.openDetail(1);
    await settle();
    table.edit(1);

    expect(lines()).toEqual(['tdb-row-detail: About N01']);

    table.cancel(1);

    expect(lines()).toEqual(['tdb-row-detail: About N01']);
    expect(button().textContent).toBe('▾');
  });

  it('runs again after a save, with the new values', async () => {
    const detail = vi.fn((row: Row) => `About ${row.name}`);
    const { table, container, lines } = setup({ detail });

    table.openDetail(1);
    await settle();
    table.edit(1);
    type(container.querySelector<HTMLInputElement>('.tdb-input') as HTMLInputElement, 'Nadia');
    await table.save(1);
    await settle();

    expect(detail).toHaveBeenCalledTimes(2);
    expect(lines()).toEqual(['tdb-row-detail: About Nadia']);
  });

  it("doesn't open a closed detail after a save", async () => {
    const detail = vi.fn(() => '');
    const { table } = setup({ detail });

    table.edit(1);
    await table.save(1);

    expect(detail).not.toHaveBeenCalled();
    expect(table.isDetailOpen(1)).toBe(false);
  });

  it('shows a failed save under the detail, and removes it on cancel', async () => {
    const { table, lines } = setup({
      onSave: () => {
        throw new Error('Refused');
      },
    });

    table.openDetail(1);
    await settle();
    table.edit(1);
    await table.save(1);

    expect(lines()).toEqual(['tdb-row-detail: About N01', 'tdb-row-error: Refused']);

    table.cancel(1);

    expect(lines()).toEqual(['tdb-row-detail: About N01']);
  });

  it('keeps the detail when the error goes away first', async () => {
    const { table, lines } = setup({
      onDelete: () => {
        throw new Error('Refused');
      },
    });

    await table.delete(1);
    table.openDetail(1);
    await settle();

    expect(lines()).toEqual(['tdb-row-detail: About N01', 'tdb-row-error: Refused']);

    table.closeDetail(1);

    expect(lines()).toEqual(['tdb-row-error: Refused']);
  });

  it('closes when the row is deleted', async () => {
    const { table, lines } = setup({ onDelete: () => {} });

    table.openDetail(1);
    table.openDetail(2);
    await settle();
    await table.delete(1);

    expect(table.isDetailOpen(1)).toBe(false);
    expect(lines()).toEqual(['tdb-row-detail: About N02']);
  });

  it('closes every detail on setData, and stops loads', async () => {
    const load = slowDetail();
    const { table, button, lines } = setup({ detail: load.detail });

    table.openDetail(1);
    table.setData(rows());

    expect(load.signal().aborted).toBe(true);
    expect(table.isDetailOpen(1)).toBe(false);
    expect(lines()).toEqual([]);
    expect(button().textContent).toBe('▸');
  });

  it('stops loads on destroy', () => {
    const load = slowDetail();
    const { table } = setup({ detail: load.detail });

    table.openDetail(1);
    table.destroy();

    expect(load.signal().aborted).toBe(true);
  });
});

describe('Enter in a detail', () => {
  it("doesn't save the row being edited", async () => {
    const onSave = vi.fn();
    const { table, container } = setup({
      onSave,
      detail: () => Object.assign(document.createElement('input'), { className: 'note' }),
    });

    table.openDetail(1);
    await settle();
    table.edit(1);
    container
      .querySelector('input.note')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle();

    expect(onSave).not.toHaveBeenCalled();
    expect(table.isEditing(1)).toBe(true);
  });
});
