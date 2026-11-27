import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import {
  type Column,
  defaultMoneyFormat,
  en,
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

/**
 * Makes the server's next reply show page 1 with row 1 changed, as if someone
 * else saved it in the meantime.
 */
function changeRow1(server: ReturnType<typeof fakeServer>['server'], changes: Partial<Row>): void {
  server.mockImplementationOnce(async () => ({
    rows: people.slice(0, 10).map((row) => (row.id === 1 ? { ...row, ...changes } : row)),
    count: people.length,
    countAll: people.length,
    totals: { salary: 32500 },
  }));
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

  it('shows the error when server throws before it returns a promise, on the first load', async () => {
    const server = vi.fn(
      (
        _request: ServerRequest<Row>,
        _context: { signal: AbortSignal },
      ): Promise<ServerResponse<Row>> => {
        throw new Error('Not logged in.');
      },
    );
    const container = mountPoint();
    const table = new Tadabut<Row>(container, { server, rowId: 'id', columns });
    await settle();

    expect(container.querySelector('.tdb-load-error')?.textContent).toBe('Not logged in.');
    expect(container.querySelector<HTMLElement>('.dt-processing')?.style.display).toBe('none');
    expect(container.querySelector('tbody td')?.textContent).not.toBe('Loading...');

    // The table still works: the next good load shows the rows.
    server.mockImplementation(() => Promise.resolve({ rows: people.slice(0, 2), count: 2 }));
    table.reload();
    await settle();

    expect(namesOf(table)).toEqual(['Person 1', 'Person 2']);
    expect(container.querySelector('.tdb-load-error')).toBeNull();
  });

  it('uses rowsFailed when server throws something that isn’t an Error before it returns a promise', async () => {
    const container = mountPoint();
    new Tadabut<Row>(container, {
      server: () => {
        throw 'nope';
      },
      rowId: 'id',
      columns,
      texts: fr,
    });
    await settle();

    expect(container.querySelector('.tdb-load-error')?.textContent).toBe(fr.rowsFailed);
  });

  it('shows nothing when server throws before it returns a promise and the table is destroyed right away', async () => {
    const container = mountPoint();
    const table = new Tadabut<Row>(container, {
      server: () => {
        throw new Error('Not logged in.');
      },
      rowId: 'id',
      columns,
    });

    table.destroy();
    await settle();

    expect(container.querySelector('.tdb-load-error')).toBeNull();
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

describe('server: replies with the wrong shape', () => {
  let error: MockInstance;

  beforeEach(() => {
    error = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    error.mockRestore();
  });

  it('treats a reply without rows as a failed load, and tells the developer in the console', async () => {
    const { server, container, table } = await setup();
    table.updateRow({ id: 1, name: 'Saved', salary: 100 });
    // A JavaScript user, or a bad cast, can send any shape.
    server.mockResolvedValueOnce({ data: [], recordsTotal: 0 } as unknown as ServerResponse<Row>);

    goToPage(container, 1);
    await settle();

    expect(container.querySelector('.tdb-load-error')?.textContent).toBe(en.rowsFailed);
    expect(container.querySelector<HTMLElement>('.dt-processing')?.style.display).toBe('none');
    expect(namesOf(table)).toHaveLength(10);
    expect(table.getRow(1)?.name).toBe('Saved');
    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0]?.[0])).toContain('Tadabut: server must return');
  });

  it('treats a reply whose count isn’t a number as a failed load', async () => {
    const { server, container } = await setup();
    // A JavaScript user, or a bad cast, can send any shape.
    server.mockResolvedValueOnce({
      rows: people.slice(10, 20),
      count: '25',
    } as unknown as ServerResponse<Row>);

    goToPage(container, 1);
    await settle();

    expect(container.querySelector('.tdb-load-error')?.textContent).toBe(en.rowsFailed);
    expect(container.querySelector('tbody tr td')?.textContent).toBe('Person 1');
    expect(error).toHaveBeenCalledOnce();
  });

  it('treats an empty reply as a failed load, like a server function that forgot to return', async () => {
    const { server, container } = await setup();
    // A JavaScript user, or a bad cast, can send any shape.
    server.mockResolvedValueOnce(undefined as unknown as ServerResponse<Row>);

    goToPage(container, 1);
    await settle();

    expect(container.querySelector('.tdb-load-error')?.textContent).toBe(en.rowsFailed);
    expect(container.querySelector<HTMLElement>('.dt-processing')?.style.display).toBe('none');
    expect(error).toHaveBeenCalledOnce();
  });

  it('shows the error on the first load, and works again after a good reply', async () => {
    const server = vi.fn(
      // A JavaScript user, or a bad cast, can send any shape.
      async (): Promise<ServerResponse<Row>> => ({ data: [] }) as unknown as ServerResponse<Row>,
    );
    const container = mountPoint();
    const table = new Tadabut<Row>(container, { server, rowId: 'id', columns, texts: fr });
    await settle();

    expect(container.querySelector('.tdb-load-error')?.textContent).toBe(fr.rowsFailed);
    expect(container.querySelector<HTMLElement>('.dt-processing')?.style.display).toBe('none');

    server.mockImplementation(async () => ({ rows: people.slice(0, 2), count: 2 }));
    table.reload();
    await settle();

    expect(namesOf(table)).toEqual(['Person 1', 'Person 2']);
    expect(container.querySelector('.tdb-load-error')).toBeNull();
  });

  it('ignores a wrong reply that comes after a newer request started', async () => {
    const { server, container, table } = await setup();
    let answer: (reply: ServerResponse<Row>) => void = () => {};
    server.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    );

    goToPage(container, 1);
    await settle();
    goToPage(container, 2);
    await settle();
    // A JavaScript user, or a bad cast, can send any shape.
    answer({ data: [] } as unknown as ServerResponse<Row>);
    await settle();

    expect(container.querySelector('.tdb-load-error')).toBeNull();
    expect(error).not.toHaveBeenCalled();
    expect(namesOf(table)[0]).toBe('Person 21');
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

  it("follows a reload that brings new values for a ticked row with totalRows: 'selected'", async () => {
    const { container, server, table } = await setup({ selection: true, totalRows: 'selected' });
    table.select([1]);

    changeRow1(server, { salary: 200 });
    table.reload();
    await settle();

    expect(container.querySelector('tbody tr td:nth-child(3)')?.textContent).toBe(
      formatMoney(200, defaultMoneyFormat),
    );
    expect(table.getTotals()).toEqual({ salary: 200 });
    expect(container.querySelector('tfoot th:nth-child(3)')?.textContent).toBe(
      formatMoney(200, defaultMoneyFormat),
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

  it('keeps the new values of a ticked row after a reload', async () => {
    const { server, table } = await setup({ selection: true });
    table.select([2, 1]);

    changeRow1(server, { name: 'Nadia', salary: 200 });
    table.reload();
    await settle();

    // Still in the order they were ticked.
    expect(table.getSelected()).toEqual([people[1], { id: 1, name: 'Nadia', salary: 200 }]);
    expect(table.isSelected(1)).toBe(true);
  });

  it('keeps the copy of a ticked row from another page when a page loads', async () => {
    const { container, table } = await setup({ selection: true });
    table.select([1]);

    goToPage(container, 1);
    await settle();
    goToPage(container, 0);
    await settle();
    goToPage(container, 1);
    await settle();

    expect(table.getSelected()).toEqual([people[0]]);
  });

  it("doesn't tick a row that changed but wasn't ticked", async () => {
    const { server, table } = await setup({ selection: true });

    changeRow1(server, { name: 'Nadia' });
    table.reload();
    await settle();

    expect(table.getSelected()).toEqual([]);
    expect(table.isSelected(1)).toBe(false);
  });

  it("doesn't call onSelect when a reload only brings new values for a ticked row", async () => {
    const onSelect = vi.fn();
    const { server, table } = await setup({ selection: true, onSelect });
    table.select([1]);
    onSelect.mockClear();

    changeRow1(server, { name: 'Nadia' });
    table.reload();
    await settle();

    expect(onSelect).not.toHaveBeenCalled();
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

/** A promise the test settles by hand. Unlike `waiting`, each call gets its own. */
function later<Value>(): {
  readonly promise: Promise<Value>;
  readonly resolve: (value: Value) => void;
  readonly reject: (error: unknown) => void;
} {
  let resolve: (value: Value) => void = () => {};
  let reject: (error: unknown) => void = () => {};

  const promise = new Promise<Value>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/** The `<tr>` of a row on the page, found by the name in its first cell. */
function trOf(container: HTMLElement, name: string): HTMLTableRowElement | undefined {
  return [...container.querySelectorAll<HTMLTableRowElement>('tbody tr')].find(
    (tr) => tr.cells[0]?.textContent === name,
  );
}

/**
 * Whether a row on the page is locked, like while it saves. `undefined` if it
 * isn't on the page. jsdom only knows `inert` once it was set, so a new row
 * that was never locked has none.
 */
function isLocked(container: HTMLElement, name: string): boolean | undefined {
  const tr = trOf(container, name);

  return tr === undefined
    ? undefined
    : tr.inert === true && tr.classList.contains('tdb-row-saving');
}

/**
 * A pretend server over `people` that forgets the deleted rows, and an
 * `onDelete` that waits for the test for each row.
 */
function deletingServer() {
  const gone = new Set<number>();
  const calls = new Map<number, ReturnType<typeof later<void>>>();

  const server = vi.fn(async (request: ServerRequest<Row>): Promise<ServerResponse<Row>> => {
    const rows = people.filter((row) => !gone.has(row.id));

    return { rows: rows.slice(request.start, request.start + request.length), count: rows.length };
  });

  const onDelete = vi.fn((row: Row) => {
    const call = later<void>();
    calls.set(row.id, call);

    return call.promise;
  });

  /** Finishes the delete of a row: the server forgets it. */
  const finish = (id: number): void => {
    gone.add(id);
    calls.get(id)?.resolve();
  };

  /** Makes the delete of a row fail. */
  const fail = (id: number, message: string): void => {
    calls.get(id)?.reject(new Error(message));
  };

  return { server, onDelete, finish, fail };
}

describe('server: jobs still running when the page reloads', () => {
  it('keeps a row locked while it is deleted, when another delete reloads the page', async () => {
    const fake = deletingServer();
    const onDeleted = vi.fn();
    const { container, table } = await setup({ ...fake, onDeleted });

    const first = table.delete(1);
    const second = table.delete(2);
    fake.finish(1);
    await first;
    await settle();

    expect(trOf(container, 'Person 1')).toBeUndefined();
    expect(isLocked(container, 'Person 2')).toBe(true);
    expect(await table.delete(2)).toBe(false);
    expect(fake.onDelete).toHaveBeenCalledTimes(2);

    const calls = fake.server.mock.calls.length;
    fake.finish(2);

    expect(await second).toBe(true);

    await settle();

    expect(onDeleted).toHaveBeenCalledTimes(2);
    expect(onDeleted).toHaveBeenLastCalledWith(people[1]);
    expect(fake.server.mock.calls.length).toBe(calls + 1);
    expect(trOf(container, 'Person 2')).toBeUndefined();
  });

  it('shows the error and unlocks the row when its delete fails after the page reloaded', async () => {
    const fake = deletingServer();
    const { container, table } = await setup({ ...fake });

    const first = table.delete(1);
    const second = table.delete(2);
    fake.finish(1);
    await first;
    await settle();
    fake.fail(2, 'Still in use');

    expect(await second).toBe(false);
    expect(isLocked(container, 'Person 2')).toBe(false);
    expect(container.querySelector('tr.tdb-row-error')?.textContent).toContain('Still in use');

    const again = table.delete(2);
    fake.finish(2);

    expect(await again).toBe(true);
  });

  it('still fires deleted and reloads when the user changed page during the delete', async () => {
    const fake = deletingServer();
    const onDeleted = vi.fn();
    const { container, table } = await setup({ ...fake, onDeleted });

    const deleting = table.delete(3);
    goToPage(container, 1);
    await settle();

    const calls = fake.server.mock.calls.length;
    fake.finish(3);

    expect(await deleting).toBe(true);
    expect(onDeleted).toHaveBeenCalledWith(people[2]);
    expect(fake.server.mock.calls.length).toBe(calls + 1);
  });

  it('finishes a save when the page reloads during it, and shows the saved values', async () => {
    const save = later<Row>();
    const onSaved = vi.fn();
    const { container, table } = await setup({ onSave: () => save.promise, onSaved });

    table.edit(1);
    type(container.querySelector('tr.tdb-row-editing .tdb-input') as HTMLInputElement, 'Saved');
    const saving = table.save(1);
    table.reload();
    await settle();

    expect(container.querySelector('tr.tdb-row-editing')).toBeNull();
    expect(isLocked(container, 'Person 1')).toBe(true);
    expect(await table.delete(1)).toBe(false);

    save.resolve({ ...people[0], name: 'Saved' } as Row);

    expect(await saving).toBe(true);
    expect(onSaved).toHaveBeenCalledWith({ ...people[0], name: 'Saved' }, { previous: people[0] });
    expect(table.getRow(1)?.name).toBe('Saved');
    expect(isLocked(container, 'Saved')).toBe(false);
    expect(table.isEditing(1)).toBe(false);
  });

  it('shows the error and unlocks the row when its save fails after the page reloaded', async () => {
    const save = later<Row>();
    const { container, table } = await setup({ onSave: () => save.promise });

    table.edit(1);
    type(container.querySelector('tr.tdb-row-editing .tdb-input') as HTMLInputElement, 'Saved');
    const saving = table.save(1);
    table.reload();
    await settle();
    save.reject(new Error('Name taken'));

    expect(await saving).toBe(false);
    expect(table.isEditing(1)).toBe(false);
    expect(table.getRow(1)?.name).toBe('Person 1');
    expect(isLocked(container, 'Person 1')).toBe(false);
    expect(container.querySelector('tr.tdb-row-error')?.textContent).toContain('Name taken');
    expect(table.edit(1)).toBe(true);
  });

  it('gives the auto row back once a save that outlived a reload is done', async () => {
    const save = later<Row>();
    const { container, table } = await setup({ autoAdd: true, onSave: () => save.promise });

    table.edit(1);
    const saving = table.save(1);
    table.reload();
    await settle();

    expect(table.isAdding()).toBe(false);

    save.resolve(people[0] as Row);
    await saving;

    expect(table.isAdding()).toBe(true);
    expect(container.querySelector('tr.tdb-row-new')).not.toBeNull();
  });

  it('keeps the new row while it saves, when the page reloads during it', async () => {
    const add = later<Row>();
    const onAdded = vi.fn();
    const { container, server, table } = await setup({ onAdd: () => add.promise, onAdded });

    table.add();
    type(container.querySelector('.tdb-row-new .tdb-input') as HTMLInputElement, 'New one');
    const adding = table.saveNew();
    table.reload();
    await settle();

    expect(table.isAdding()).toBe(true);
    expect(container.querySelector<HTMLTableRowElement>('tr.tdb-row-new')?.inert).toBe(true);

    const calls = server.mock.calls.length;
    add.resolve({ id: 99, name: 'New one', salary: 0 });

    expect(await adding).toBe(true);
    expect(onAdded).toHaveBeenCalledWith({ id: 99, name: 'New one', salary: 0 });
    expect(server.mock.calls.length).toBe(calls + 1);
    expect(table.isAdding()).toBe(false);
  });

  it('keeps the new row open with its error when its save fails after the page reloaded', async () => {
    const add = later<Row>();
    const { container, table } = await setup({ onAdd: () => add.promise });

    table.add();
    type(container.querySelector('.tdb-row-new .tdb-input') as HTMLInputElement, 'New one');
    const adding = table.saveNew();
    table.reload();
    await settle();
    add.reject(new Error('Too many people'));

    expect(await adding).toBe(false);
    expect(table.isAdding()).toBe(true);
    expect(container.querySelector('tr.tdb-row-new')?.classList.contains('tdb-row-saving')).toBe(
      false,
    );
    expect(container.querySelector('.tdb-row-new .tdb-input')).toHaveProperty('value', 'New one');
    expect(container.textContent).toContain('Too many people');
  });

  it('still closes a new row that is not saving when the page reloads', async () => {
    const { table } = await setup();

    table.add();
    table.reload();
    await settle();

    expect(table.isAdding()).toBe(false);
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
