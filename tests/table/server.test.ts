import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import {
  type Column,
  defaultMoneyFormat,
  formatMoney,
  fr,
  type ServerRequest,
  type ServerResponse,
  Tadabut,
  type TadabutOptions,
} from '../../src/index';
import { goToPage, mountPoint, search, settle, type } from '../helpers';

type Row = { id: number; name: string; salary: number };

/** 25 rows: Person 1 to Person 25, with salaries of 100, 200, … */
const people: Row[] = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1,
  name: `Person ${index + 1}`,
  salary: (index + 1) * 100,
}));

const columns: Column<Row>[] = [
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
  { title: 'Salary', prop: 'salary', editor: { type: 'money' }, total: 'sum' },
];

/**
 * A pretend server over `people`: it searches, sorts and cuts the page like
 * a real one, and remembers every request.
 */
function fakeServer() {
  const requests: ServerRequest<Row>[] = [];
  const signals: AbortSignal[] = [];

  const server = vi.fn(
    async (
      request: ServerRequest<Row>,
      { signal }: { signal: AbortSignal },
    ): Promise<ServerResponse<Row>> => {
      requests.push(request);
      signals.push(signal);

      const found = people.filter((row) => row.name.includes(request.search));
      const [first] = request.order;

      if (first !== undefined) {
        const sign = first.dir === 'asc' ? 1 : -1;
        found.sort((a, b) => (a[first.prop] > b[first.prop] ? sign : -sign));
      }

      const page =
        request.length < 0 ? found : found.slice(request.start, request.start + request.length);

      return {
        rows: page,
        count: found.length,
        countAll: people.length,
        totals: { salary: found.reduce((sum, row) => sum + row.salary, 0) },
      };
    },
  );

  return { server, requests, signals };
}

/** A table on the fake server, with the first page loaded. */
async function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const fake = fakeServer();
  const container = mountPoint();
  const table = new Tadabut<Row>(container, {
    server: fake.server,
    rowId: 'id',
    columns,
    onSave: (row) => row,
    onAdd: (row) => ({ ...row, id: 99 }) as Row,
    onDelete: () => {},
    confirmDelete: false,
    dataTables: { pageLength: 10, order: [] },
    ...options,
  });

  await settle();

  return { ...fake, container, table };
}

/** The names on the page, read from the table's own rows. */
function namesOf(table: Tadabut<Row>): string[] {
  return table.getData().map((row) => row.name);
}

let warn: MockInstance;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe('server: loading', () => {
  it('asks for the first page and shows it', async () => {
    const { requests, table } = await setup();

    expect(requests).toEqual([{ start: 0, length: 10, order: [], search: '' }]);
    expect(namesOf(table)).toEqual(people.slice(0, 10).map((row) => row.name));
  });

  it('asks again for each page, with the right start', async () => {
    const { requests, container, table } = await setup();

    goToPage(container, 2);
    await settle();

    expect(requests.at(-1)).toMatchObject({ start: 20, length: 10 });
    expect(namesOf(table)).toEqual([
      'Person 21',
      'Person 22',
      'Person 23',
      'Person 24',
      'Person 25',
    ]);
  });

  it('sends the field and direction, not the column number', async () => {
    const { requests, table } = await setup({ selection: true });

    // Column 2 for DataTables: the checkbox is 0, Name 1, Salary 2.
    table.getApi().order([2, 'desc']).draw();
    await settle();

    expect(requests.at(-1)?.order).toEqual([{ prop: 'salary', dir: 'desc' }]);
    expect(namesOf(table)[0]).toBe('Person 25');
  });

  it('sends the starting order, moved past Tadabut’s own columns', async () => {
    const { requests } = await setup({ selection: true, dataTables: { order: [[0, 'desc']] } });

    expect(requests[0]?.order).toEqual([{ prop: 'name', dir: 'desc' }]);
  });

  it('sends the search, and shows the counts in the info line', async () => {
    const { requests, container } = await setup();

    search(container, 'Person 1');

    await vi.waitFor(() => expect(requests.at(-1)?.search).toBe('Person 1'), { timeout: 2000 });
    await settle();

    // Person 1, 10 to 19: 11 rows.
    expect(container.querySelector('.dt-info')?.textContent).toBe(
      'Showing 1 to 10 of 11 entries (filtered from 25 total entries)',
    );
  });

  it("doesn't ask the server when a row is saved or cancelled", async () => {
    const { server, table } = await setup();
    const calls = server.mock.calls.length;

    table.edit(1);
    table.cancel(1);
    table.edit(2);
    await table.save(2);

    expect(server.mock.calls.length).toBe(calls);
  });

  it('asks again with reload, on the same page', async () => {
    const { requests, container, table } = await setup();

    goToPage(container, 1);
    await settle();
    table.reload();
    await settle();

    expect(requests.at(-1)).toMatchObject({ start: 10 });
    expect(requests).toHaveLength(3);
  });
});

describe('server: requests that overlap', () => {
  it('aborts the older request, and ignores its late answer', async () => {
    let answerFirst: (response: ServerResponse<Row>) => void = () => {};
    let calls = 0;

    const server = vi.fn((_request: ServerRequest<Row>, _context: { signal: AbortSignal }) => {
      calls++;

      // The first call answers only when the test says so, after the second.
      if (calls === 2) {
        return new Promise<ServerResponse<Row>>((resolve) => {
          answerFirst = resolve;
        });
      }

      return Promise.resolve({ rows: people.slice(0, 2), count: 2 });
    });

    const container = mountPoint();
    const table = new Tadabut<Row>(container, {
      server,
      rowId: 'id',
      columns,
      dataTables: { order: [] },
    });
    await settle();

    table.reload();
    table.reload();
    await settle();

    expect(server.mock.calls[1]?.[1].signal.aborted).toBe(true);

    answerFirst({ rows: [people[24] as Row], count: 1 });
    await settle();

    expect(namesOf(table)).toEqual(['Person 1', 'Person 2']);
  });

  it('aborts the request in progress on destroy', async () => {
    const server = vi.fn(
      (_request: ServerRequest<Row>, _context: { signal: AbortSignal }) =>
        new Promise<ServerResponse<Row>>(() => {}),
    );
    const table = new Tadabut<Row>(mountPoint(), { server, rowId: 'id', columns });

    table.destroy();

    expect(server.mock.calls[0]?.[1].signal.aborted).toBe(true);
  });
});

describe('server: errors', () => {
  it('keeps the old rows and shows the message above the table', async () => {
    const { server, container, table } = await setup();
    server.mockRejectedValueOnce(new Error('The server is down.'));

    table.reload();
    await settle();

    const error = container.querySelector('.tdb-load-error');

    expect(error?.textContent).toBe('The server is down.');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.nextElementSibling?.tagName).toBe('TABLE');
    expect(namesOf(table)).toHaveLength(10);
  });

  it('uses rowsFailed when what was thrown isn’t an Error, and takes the line away after a good load', async () => {
    const { server, container, table } = await setup({ texts: fr });
    server.mockRejectedValueOnce('nope');

    table.reload();
    await settle();

    expect(container.querySelector('.tdb-load-error')?.textContent).toBe(fr.rowsFailed);

    table.reload();
    await settle();

    expect(container.querySelector('.tdb-load-error')).toBeNull();
  });

  it('shows the message as text, never as HTML', async () => {
    const { server, container, table } = await setup();
    server.mockRejectedValueOnce(new Error('<img src=x onerror=alert(1)>'));

    table.reload();
    await settle();

    expect(container.querySelector('.tdb-load-error img')).toBeNull();
  });

  it('keeps a saved row when the next page fails to load', async () => {
    const { server, container, table } = await setup();

    table.edit(1);
    type(container.querySelector<HTMLInputElement>('.tdb-input') as HTMLInputElement, 'Saved');
    expect(await table.save(1)).toBe(true);

    server.mockRejectedValueOnce(new Error('Down.'));
    goToPage(container, 1);
    await settle();

    expect(container.querySelector('tbody tr td')?.textContent).toBe('Saved');
    expect(table.getRow(1)?.name).toBe('Saved');
  });

  it('keeps a row changed with updateRow when the next page fails to load', async () => {
    const { server, container, table } = await setup();

    table.updateRow({ id: 1, name: 'Saved', salary: 100 });

    server.mockRejectedValueOnce(new Error('Down.'));
    goToPage(container, 1);
    await settle();

    expect(container.querySelector('tbody tr td')?.textContent).toBe('Saved');
    expect(table.getRow(1)?.name).toBe('Saved');
  });

  it('keeps a saved row after two failed loads in a row', async () => {
    const { server, container, table } = await setup();

    table.updateRow({ id: 1, name: 'Saved', salary: 100 });

    server.mockRejectedValueOnce(new Error('Down.'));
    goToPage(container, 1);
    await settle();
    server.mockRejectedValueOnce(new Error('Still down.'));
    goToPage(container, 2);
    await settle();

    expect(container.querySelector('tbody tr td')?.textContent).toBe('Saved');
    expect(table.getRow(1)?.name).toBe('Saved');
    expect(namesOf(table)).toHaveLength(10);
  });

  it('removes the error line on destroy', async () => {
    const { server, container, table } = await setup();
    server.mockRejectedValueOnce(new Error('Down.'));
    table.reload();
    await settle();

    table.destroy();

    expect(container.querySelector('.tdb-load-error')).toBeNull();
  });
});

describe('server: totals', () => {
  it('shows the totals the server sent, formatted like the cells', async () => {
    const { container, table } = await setup();

    // 100 + 200 + … + 2,500
    expect(container.querySelector('tfoot th:nth-child(2)')?.textContent).toBe(
      formatMoney(32500, defaultMoneyFormat),
    );
    expect(table.getTotals()).toEqual({ salary: 32500 });
  });

  it('leaves the cell empty and warns once when a total is missing', async () => {
    const server = vi.fn(async () => ({ rows: people.slice(0, 2), count: 2 }));
    const container = mountPoint();
    const table = new Tadabut<Row>(container, { server, rowId: 'id', columns });
    await settle();
    table.reload();
    await settle();

    expect(container.querySelector('tfoot th:nth-child(2)')?.textContent).toBe('');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Tadabut: the server sent no total for "salary".');
  });

  it("doesn't warn before the first reply", () => {
    const server = vi.fn(() => new Promise<ServerResponse<Row>>(() => {}));
    new Tadabut<Row>(mountPoint(), { server, rowId: 'id', columns });

    expect(warn).not.toHaveBeenCalled();
  });

  it("counts the ticked rows itself with totalRows: 'selected', across pages", async () => {
    const { container, table } = await setup({ selection: true, totalRows: 'selected' });

    table.select([1, 2]);
    goToPage(container, 1);
    await settle();
    table.select([11]);

    // 100 + 200 + 1,100
    expect(table.getTotals()).toEqual({ salary: 1400 });
    expect(container.querySelector('tfoot th:nth-child(3)')?.textContent).toBe(
      formatMoney(1400, defaultMoneyFormat),
    );
  });

  it("follows a save of a ticked row with totalRows: 'selected'", async () => {
    const { container, table } = await setup({ selection: true, totalRows: 'selected' });
    const salaryInput = () =>
      container.querySelector<HTMLInputElement>(
        'tbody tr td:nth-child(3) input',
      ) as HTMLInputElement;

    table.select([1]);
    table.edit(1);
    type(salaryInput(), '500');

    expect(await table.save(1)).toBe(true);
    expect(container.querySelector('tfoot th:nth-child(3)')?.textContent).toBe(
      formatMoney(500, defaultMoneyFormat),
    );
  });

  it("follows updateRow on a ticked row with totalRows: 'selected'", async () => {
    const { container, table } = await setup({ selection: true, totalRows: 'selected' });

    table.select([1]);
    table.updateRow({ id: 1, name: 'Person 1', salary: 700 });

    expect(container.querySelector('tfoot th:nth-child(3)')?.textContent).toBe(
      formatMoney(700, defaultMoneyFormat),
    );
  });

  it("keeps the server's total after a save without 'selected'", async () => {
    const { container, table } = await setup();

    table.updateRow({ id: 1, name: 'Person 1', salary: 700 });

    expect(container.querySelector('tfoot th:nth-child(2)')?.textContent).toBe(
      formatMoney(32500, defaultMoneyFormat),
    );
  });
});

describe('server: selection', () => {
  it('keeps ticked rows from other pages', async () => {
    const onSelect = vi.fn();
    const { container, table } = await setup({ selection: true, onSelect });

    table.select([1, 2]);
    goToPage(container, 1);
    await settle();

    expect(table.isSelected(1)).toBe(true);
    expect(table.getSelected().map((row) => row.id)).toEqual([1, 2]);

    table.select([12]);

    expect(table.getSelected().map((row) => row.id)).toEqual([1, 2, 12]);
    expect(onSelect).toHaveBeenLastCalledWith(people.filter((row) => [1, 2, 12].includes(row.id)));
  });

  it('ticks only the page with the header checkbox', async () => {
    const { container, table } = await setup({ selection: { checkAll: 'all' } });
    const all = container.querySelector<HTMLInputElement>('.tdb-select-all') as HTMLInputElement;

    all.click();

    expect(table.getSelected()).toHaveLength(10);
  });

  it('keeps the new values of a ticked row after a save', async () => {
    const { table } = await setup({ selection: true });
    table.select([1]);

    table.edit(1);
    const input = document.querySelector<HTMLInputElement>('.tdb-input') as HTMLInputElement;
    type(input, 'Nadia');
    await table.save(1);

    expect(table.getSelected()[0]?.name).toBe('Nadia');
  });

  it('unticks a deleted row', async () => {
    const { table } = await setup({ selection: true });
    table.select([1, 2]);

    await table.delete(1);

    expect(table.getSelected().map((row) => row.id)).toEqual([2]);
  });
});

describe('server: add and delete', () => {
  it('reloads the page after an add, and opens the next auto row with the cursor in it', async () => {
    const onAdded = vi.fn();
    const { server, table } = await setup({ autoAdd: true, onAdded });
    const calls = server.mock.calls.length;

    type(document.querySelector('.tdb-row-new .tdb-input') as HTMLInputElement, 'New one');
    await table.saveNew();

    expect(onAdded).toHaveBeenCalledWith({ name: 'New one', salary: null, id: 99 });
    expect(server.mock.calls.length).toBe(calls + 1);

    await settle();

    expect(table.isAdding()).toBe(true);
    expect(document.activeElement?.closest('.tdb-row-new')).not.toBeNull();
  });

  it("doesn't check the added id against the page, since the server decides", async () => {
    const { server, table } = await setup({ onAdd: (row) => ({ ...row, id: 1 }) as Row });
    const calls = server.mock.calls.length;
    table.add();
    type(document.querySelector('.tdb-row-new .tdb-input') as HTMLInputElement, 'New one');

    expect(await table.saveNew()).toBe(true);
    expect(server.mock.calls.length).toBe(calls + 1);
  });

  it('reloads the page after a delete', async () => {
    const onDeleted = vi.fn();
    const { server, table } = await setup({ onDeleted });
    const calls = server.mock.calls.length;

    expect(await table.delete(3)).toBe(true);

    expect(server.mock.calls.length).toBe(calls + 1);
    expect(onDeleted).toHaveBeenCalledWith(people[2]);
  });
});

describe('server: leaving the page', () => {
  it('closes open rows, the new row and details, and forgets the highlight', async () => {
    const onCurrentChange = vi.fn();
    const { container, table } = await setup({
      currentRow: true,
      onCurrentChange,
      detail: () => 'Lines',
      editing: { mode: 'multiple' },
    });

    table.edit(1);
    table.add();
    table.openDetail(2);
    table.setCurrent(3);
    goToPage(container, 1);
    await settle();

    expect(table.isEditing(1)).toBe(false);
    expect(table.isAdding()).toBe(false);
    expect(table.isDetailOpen(2)).toBe(false);
    expect(table.getCurrent()).toBeUndefined();
    expect(onCurrentChange).toHaveBeenLastCalledWith(null);
  });

  it('keeps the highlight when its row is still on the page after a reload', async () => {
    const { table } = await setup({ currentRow: true });

    table.setCurrent(3);
    table.reload();
    await settle();

    expect(table.isCurrent(3)).toBe(true);
  });
});

describe('server: what it refuses', () => {
  it('throws with both data and server', () => {
    expect(
      () =>
        new Tadabut<Row>(mountPoint(), {
          data: people,
          server: async () => ({ rows: [], count: 0 }),
          rowId: 'id',
          columns,
        }),
    ).toThrow('Tadabut: use data or server, not both.');
  });

  it('throws from setData, insertRow and removeRow', async () => {
    const { table } = await setup();

    expect(() => table.setData([])).toThrow(
      "Tadabut: setData doesn't work with server. Use reload().",
    );
    expect(() => table.insertRow(people[0] as Row)).toThrow('insertRow');
    expect(() => table.removeRow(1)).toThrow('removeRow');
  });

  it('throws from reload without server', () => {
    const table = new Tadabut<Row>(mountPoint(), { data: people, rowId: 'id', columns });

    expect(() => table.reload()).toThrow(
      'Tadabut: reload() is for server. Use setData() to change the rows.',
    );
  });

  it('still updates a row on the page with updateRow, without asking the server', async () => {
    const { server, table } = await setup();
    const calls = server.mock.calls.length;

    expect(table.updateRow({ id: 1, name: 'Changed', salary: 1 })).toBe(true);

    expect(table.getRow(1)?.name).toBe('Changed');
    expect(server.mock.calls.length).toBe(calls);
  });
});
