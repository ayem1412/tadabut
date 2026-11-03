import DataTable from 'datatables.net';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Column, type DataTablesSettings, Tadabut } from '../../src/index';

type Row = { id: number; name: string; code: string };

const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Name ${String(i + 1).padStart(2, '0')}`,
  code: `C${i + 1}`,
}));

const basic: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name' },
];

function setup(columns: Column<Row>[] = basic, dataTables?: DataTablesSettings) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const table = new Tadabut(container, { data: rows, rowId: 'id', columns, dataTables });

  const ids = () =>
    [...container.querySelectorAll('tbody tr td:first-child')].map((td) => td.textContent);
  const headers = () => [...container.querySelectorAll<HTMLElement>('thead th')];
  const search = (text: string) => {
    const input = container.querySelector('.dt-search input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
  };

  return { container, table, ids, headers, search };
}

/** DataTables sorts on the next tick. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('dataTables settings', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses the given order', () => {
    const { ids } = setup(basic, { order: [[1, 'desc']] });

    expect(ids()[0]).toBe('12');
  });

  it('uses the given page length', () => {
    const { ids } = setup(basic, { pageLength: 5 });

    expect(ids()).toHaveLength(5);
  });

  it('can turn paging off', () => {
    const { ids, container } = setup(basic, { paging: false });

    expect(ids()).toHaveLength(12);
    expect(container.querySelector('.dt-paging')).toBeNull();
  });

  it('can turn the search box off', () => {
    const { container } = setup(basic, { searching: false });

    expect(container.querySelector('.dt-search')).toBeNull();
  });

  it('uses the given texts', () => {
    const { container } = setup(basic, { language: { search: 'Rechercher :' } });

    expect(container.querySelector('.dt-search label')?.textContent).toBe('Rechercher :');
  });

  it('always uses its own data and columns', () => {
    // A JavaScript user can pass anything: the type check is skipped here.
    const { ids, headers } = setup(basic, {
      data: [],
      columns: [{ title: 'Wrong' }],
    } as never);

    expect(ids()).toHaveLength(10);
    expect(headers().map((th) => th.textContent)).toEqual(['ID', 'Name']);
  });
});

describe('column options', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('hides a column with visible: false, and onSave still gets its value', async () => {
    const onSave = vi.fn((_row: Row) => {});
    const container = document.createElement('div');
    document.body.appendChild(container);
    const table = new Tadabut(container, {
      data: rows,
      rowId: 'id',
      onSave,
      columns: [
        { title: 'ID', prop: 'id' },
        { title: 'Name', prop: 'name', editor: { type: 'text' } },
        { title: 'Code', prop: 'code', visible: false },
      ],
    });

    const titles = [...container.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(titles).not.toContain('Code');

    table.edit(1);
    await table.save(1);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ code: 'C1' }), expect.anything());
  });

  it('does not sort when orderable is false', async () => {
    const { ids, headers } = setup([
      { title: 'ID', prop: 'id' },
      { title: 'Name', prop: 'name', orderable: false },
    ]);
    const before = ids();

    headers()[1]?.click();
    await flush();

    expect(ids()).toEqual(before);
  });

  it('leaves a column out of the search when searchable is false', () => {
    const { container, search } = setup([
      { title: 'ID', prop: 'id' },
      { title: 'Name', prop: 'name', searchable: false },
    ]);

    search('Name 05');

    // Nothing matched: DataTables shows its "no records" line instead.
    expect(container.querySelector('tbody td.dt-empty')).not.toBeNull();
  });

  it('adds className to the cells and the header', () => {
    const { container, headers } = setup([
      { title: 'ID', prop: 'id', className: 'text-end' },
      { title: 'Name', prop: 'name' },
    ]);

    expect(headers()[0]?.classList.contains('text-end')).toBe(true);
    expect(container.querySelector('tbody td')?.classList.contains('text-end')).toBe(true);
    expect(container.querySelector('tbody td:nth-child(2)')?.classList.contains('text-end')).toBe(
      false,
    );
  });

  it('gives the width to DataTables', () => {
    const { container } = setup([
      { title: 'ID', prop: 'id', width: '60px' },
      { title: 'Name', prop: 'name' },
    ]);
    // jsdom has no layout, so DataTables measures every width as 0px. Check
    // the width DataTables was given instead: it keeps it as `widthOrig`.
    // `new DataTable` on an existing table gives back its API.
    const api = new DataTable(container.querySelector('table') as HTMLTableElement);
    const settings = api.settings()[0] as unknown as {
      columns: { widthOrig: string | null }[];
    };

    expect(settings.columns[0]?.widthOrig).toBe('60px');
    expect(settings.columns[1]?.widthOrig).toBeFalsy();
  });

  it('refuses a hidden column with an editor', () => {
    expect(() =>
      setup([
        { title: 'ID', prop: 'id' },
        { title: 'Name', prop: 'name', editor: { type: 'text' }, visible: false },
      ]),
    ).toThrow('Tadabut: the "name" column can\'t have both an editor and visible: false.');
  });

  it('accepts an editable column without visible', () => {
    expect(() =>
      setup([
        { title: 'ID', prop: 'id' },
        { title: 'Name', prop: 'name', editor: { type: 'text' } },
      ]),
    ).not.toThrow();
  });
});
