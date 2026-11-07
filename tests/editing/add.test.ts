import { describe, expect, it, vi } from 'vitest';

import { type Column, fr, Tadabut, type TadabutOptions } from '../../src/index';
import { goToPage, mountPoint, search, settle, type, waiting } from '../helpers';

type Row = { id: number; name: string; age: number | null; team: string; note: string };

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text', required: true } },
  { title: 'Age', prop: 'age', editor: { type: 'number' }, className: 'dt-right' },
  { title: 'Team', prop: 'team' },
  { title: 'Note', prop: 'note', visible: false },
];

/** 25 rows named N00 to N24, so 3 pages of 10. */
function rows(): Row[] {
  return Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `N${String(i).padStart(2, '0')}`,
    age: 20 + i,
    team: 'A',
    note: '',
  }));
}

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    dataTables: { order: [[1, 'asc']] },
    ...options,
  });

  const newTr = () => container.querySelector<HTMLTableRowElement>('tr.tdb-row-new');
  const input = (index: number) =>
    newTr()?.querySelectorAll<HTMLInputElement>('input')[index] as HTMLInputElement;
  /** Types into the new row's Name input. */
  const typeName = (value: string) => type(input(0), value);
  const click = (action: string) =>
    container.querySelector<HTMLElement>(`tr.tdb-row-new [data-tdb-action="${action}"]`)?.click();
  const key = (name: string) =>
    input(0).dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
  const info = () => container.querySelector('.dt-info')?.textContent;
  const shownNames = () =>
    [...container.querySelectorAll('tbody:not(.tdb-new-rows) tr')].map(
      (tr) => tr.querySelectorAll('td')[1]?.textContent,
    );
  const newError = () =>
    container.querySelector('.tdb-new-rows .tdb-row-error-message')?.textContent;

  return { container, table, newTr, input, typeName, click, key, info, shownNames, newError };
}

describe('add()', () => {
  it('opens a row in its own tbody, above the data', () => {
    const { container, table, newTr } = setup();

    expect(table.add()).toBe(true);

    const bodies = container.querySelectorAll('table > tbody');
    expect(bodies).toHaveLength(2);
    expect(bodies[0]?.classList.contains('tdb-new-rows')).toBe(true);
    expect(newTr()?.classList.contains('tdb-row-editing')).toBe(true);
    expect(table.isAdding()).toBe(true);
  });

  it('has one cell per shown column, skipping hidden ones', () => {
    const { container, table, newTr } = setup();

    table.add();

    const headers = container.querySelectorAll('thead th').length;
    expect(newTr()?.cells).toHaveLength(headers);
    expect(newTr()?.cells[2]?.classList.contains('dt-right')).toBe(true);
    expect(newTr()?.cells[4]?.classList.contains('tdb-actions')).toBe(true);
  });

  it('starts empty, or with the defaults, and puts the cursor in the first input', () => {
    const { table, newTr, input } = setup();

    table.add({ id: 99, age: 30, team: '<b>B</b>' });

    expect(input(0).value).toBe('');
    expect(input(1).value).toBe('30');
    expect(newTr()?.cells[0]?.textContent).toBe('99');
    expect(newTr()?.cells[3]?.textContent).toBe('<b>B</b>');
    expect(newTr()?.querySelector('b')).toBeNull();
    expect(document.activeElement).toBe(input(0));
  });

  it('opens only one new row', () => {
    const { container, table } = setup();

    table.add();

    expect(table.add()).toBe(false);
    expect(container.querySelectorAll('tr.tdb-row-new')).toHaveLength(1);
  });

  it('does nothing when no column has an editor', () => {
    const { table } = setup({ columns: [{ title: 'ID', prop: 'id' }] });

    expect(table.add()).toBe(false);
    expect(table.isAdding()).toBe(false);
  });

  it('stays at the top when the table is sorted, searched or paged', () => {
    const { container, table, newTr } = setup();
    table.add();
    const opened = newTr();

    container.querySelector<HTMLElement>('thead th:nth-child(3)')?.click();
    goToPage(container, 1);
    search(container, 'N0');

    expect(newTr()).toBe(opened);
    expect(container.querySelector('table > tbody')?.classList.contains('tdb-new-rows')).toBe(true);
  });

  it('uses the texts and classes for Save and Cancel', () => {
    const { table, newTr } = setup({ texts: fr, classNames: { button: 'btn', save: 'ok' } });

    table.add();

    const buttons = [...(newTr()?.querySelectorAll('button') ?? [])];
    expect(buttons.map((b) => b.textContent)).toEqual(['Enregistrer', 'Annuler']);
    expect(buttons[0]?.className).toBe('tdb-button tdb-button-save btn ok');
  });

  it('has no buttons without the actions column, but Enter still saves', async () => {
    const { table, newTr, typeName, key } = setup({ editing: { button: false } });
    table.add({ id: 99 });
    typeName('Zed');

    expect(newTr()?.querySelector('button')).toBeNull();

    key('Enter');
    await settle();

    expect(table.isAdding()).toBe(false);
  });
});

describe('cancelNew()', () => {
  it('closes the row on Cancel', () => {
    const { container, table, click } = setup();
    table.add();

    click('cancel');

    expect(table.isAdding()).toBe(false);
    expect(container.querySelector('.tdb-new-rows')).toBeNull();
  });

  it('closes the row on Escape, and a new one can be opened', () => {
    const { table, key } = setup();
    table.add();

    key('Escape');

    expect(table.isAdding()).toBe(false);
    expect(table.add()).toBe(true);
  });

  it('does nothing while onAdd runs', async () => {
    const { fn: onAdd, resolve } = waiting<Row>();
    const { table, typeName } = setup({ onAdd });
    table.add();
    typeName('Zed');

    const done = table.saveNew();
    table.cancelNew();

    expect(table.isAdding()).toBe(true);

    resolve({ id: 99, name: 'Zed', age: null, team: '', note: '' });
    await done;
  });
});

describe('saveNew()', () => {
  it('passes the typed row to onAdd and adds what it returns', async () => {
    const onAdd = vi.fn((row: Partial<Row>) => ({ ...row, id: 99, team: 'B', note: '' }) as Row);
    const { table, typeName } = setup({ onAdd });
    table.add();
    typeName('Zed');

    expect(await table.saveNew()).toBe(true);

    expect(onAdd).toHaveBeenCalledWith({ name: 'Zed', age: null });
    expect(table.isAdding()).toBe(false);
    expect(table.edit(99)).toBe(true);
  });

  it('shows the page the row landed on', async () => {
    const { table, typeName, info, shownNames } = setup();
    table.add({ id: 99 });
    typeName('Zed');

    await table.saveNew();

    expect(info()).toContain('21 to 26 of 26');
    expect(shownNames()).toContain('Zed');
  });

  it('stays on the page when the search hides the new row', async () => {
    const { container, table, typeName, info } = setup();
    search(container, 'N');
    goToPage(container, 1);
    table.add({ id: 99 });
    typeName('Zed');

    expect(await table.saveNew()).toBe(true);
    expect(info()).toContain('11 to 20 of 25');
  });

  it('adds the row as typed without onAdd', async () => {
    const { table, typeName } = setup();
    table.add({ id: 99 });
    typeName('Zed');

    expect(await table.saveNew()).toBe(true);
    expect(table.edit(99)).toBe(true);
  });

  it('does not call onAdd when a field is invalid', async () => {
    const onAdd = vi.fn();
    const { container, table } = setup({ onAdd });
    table.add();

    expect(await table.saveNew()).toBe(false);

    expect(onAdd).not.toHaveBeenCalled();
    expect(container.querySelector('.tdb-row-new .tdb-error')?.textContent).toBe(
      'This field is required.',
    );
  });

  it('locks the row while onAdd runs', async () => {
    const { fn: onAdd, resolve } = waiting<Row>();
    const { table, newTr, typeName } = setup({ onAdd });
    table.add();
    typeName('Zed');

    const done = table.saveNew();

    expect(newTr()?.inert).toBe(true);
    expect(newTr()?.classList.contains('tdb-row-saving')).toBe(true);
    expect(await table.saveNew()).toBe(false);
    expect(onAdd).toHaveBeenCalledTimes(1);

    resolve({ id: 99, name: 'Zed', age: null, team: '', note: '' });
    expect(await done).toBe(true);
  });

  it('throws when the row has no id, and leaves it open', async () => {
    const { table, newTr, typeName } = setup({ onAdd: () => {} });
    table.add();
    typeName('Zed');

    await expect(table.saveNew()).rejects.toThrow(
      'Tadabut: the added row has no "id". Return it from onAdd.',
    );
    expect(table.isAdding()).toBe(true);
    expect(newTr()?.inert).toBe(false);
  });

  it('keeps the row open and shows the error when onAdd throws', async () => {
    const { table, newTr, typeName, newError, container } = setup({
      onAdd: async () => {
        throw new Error('Server says no');
      },
    });
    table.add();
    typeName('Zed');

    expect(await table.saveNew()).toBe(false);

    expect(newError()).toBe('Server says no');
    expect(table.isAdding()).toBe(true);
    expect(newTr()?.inert).toBe(false);
    const errorCell = container.querySelector<HTMLTableCellElement>(
      '.tdb-new-rows .tdb-row-error td',
    );
    expect(errorCell?.colSpan).toBe(newTr()?.cells.length);
  });

  it('shows addFailed when onAdd throws something that is not an Error', async () => {
    const { table, typeName, newError } = setup({
      onAdd: () => {
        throw 'nope';
      },
    });
    table.add();
    typeName('Zed');

    await table.saveNew();

    expect(newError()).toBe('Could not add.');
  });

  it('clears the old error on the next try', async () => {
    let fail = true;
    const { table, typeName, newError } = setup({
      onAdd: (row) => {
        if (fail) {
          throw new Error('Server says no');
        }

        return { ...row, id: 99 } as Row;
      },
    });
    table.add();
    typeName('Zed');
    await table.saveNew();
    fail = false;
    typeName('');

    await table.saveNew();

    expect(newError()).toBeUndefined();
  });

  it('saves on the Save button and on Enter', async () => {
    const { table, typeName, click, key } = setup();

    table.add({ id: 98 });
    typeName('Yan');
    click('save');
    await settle();
    expect(table.isAdding()).toBe(false);

    table.add({ id: 99 });
    typeName('Zed');
    key('Enter');
    await settle();
    expect(table.isAdding()).toBe(false);
  });

  it('adds nothing when setData runs while onAdd waits', async () => {
    const { fn: onAdd, resolve } = waiting<Row>();
    const { table, typeName, info } = setup({ onAdd });
    table.add();
    typeName('Zed');

    const done = table.saveNew();
    table.setData([{ id: 1, name: 'Amina', age: 30, team: 'A', note: '' }]);
    resolve({ id: 99, name: 'Zed', age: null, team: '', note: '' });

    expect(await done).toBe(false);
    expect(table.isAdding()).toBe(false);
    expect(info()).toContain('of 1 ');
  });

  it('does not throw when the table is destroyed while onAdd waits', async () => {
    const { fn: onAdd, reject } = waiting<Row>();
    const { table, typeName } = setup({ onAdd });
    table.add();
    typeName('Zed');

    const done = table.saveNew();
    table.destroy();
    reject(new Error('too late'));

    expect(await done).toBe(false);
    expect(table.isAdding()).toBe(false);
  });
});

describe('the new row and edited rows', () => {
  it("can't be opened while a row is edited, in single mode", () => {
    const { table } = setup();
    table.edit(1);

    expect(table.add()).toBe(false);
  });

  it("blocks editing while it's open, in single mode", () => {
    const { table } = setup();
    table.add();

    expect(table.edit(1)).toBe(false);
  });

  it('can be open next to edited rows in multiple mode', () => {
    const { table } = setup({ editing: { mode: 'multiple' } });

    expect(table.add()).toBe(true);
    expect(table.edit(1)).toBe(true);
  });

  it('is closed by setData', () => {
    const { container, table } = setup();
    table.add();

    table.setData(rows());

    expect(table.isAdding()).toBe(false);
    expect(container.querySelector('.tdb-new-rows')).toBeNull();
  });
});

describe('every editor in the new row', () => {
  type All = {
    id: number;
    name: string;
    age: number | null;
    salary: number | null;
    start: string | null;
    active: boolean;
    flag: 'O' | 'N' | null;
    team: string | null;
  };

  it('opens empty, and gives null for what was left empty', async () => {
    const onAdd = vi.fn((row: Partial<All>) => ({ ...row, id: 1 }) as All);
    const container = mountPoint();
    const table = new Tadabut<All>(container, {
      data: [],
      rowId: 'id',
      onAdd,
      columns: [
        { title: 'Name', prop: 'name', editor: { type: 'text' } },
        { title: 'Age', prop: 'age', editor: { type: 'number' } },
        { title: 'Salary', prop: 'salary', editor: { type: 'money' } },
        { title: 'Start', prop: 'start', editor: { type: 'date' } },
        { title: 'Active', prop: 'active', editor: { type: 'checkbox' } },
        {
          title: 'Flag',
          prop: 'flag',
          editor: { type: 'checkbox', values: { checked: 'O', unchecked: 'N' } },
        },
        {
          title: 'Team',
          prop: 'team',
          editor: { type: 'select', options: [{ value: 'A', label: 'Team A' }] },
        },
      ],
    });

    expect(table.add()).toBe(true);

    const values = [...container.querySelectorAll<HTMLInputElement>('.tdb-row-new input')].map(
      (input) => (input.type === 'checkbox' ? input.checked : input.value),
    );
    expect(values).toEqual(['', '', '', '', false, false]);

    await table.saveNew();

    expect(onAdd).toHaveBeenCalledWith({
      name: '',
      age: null,
      salary: null,
      start: null,
      active: null,
      flag: null,
      team: null,
    });
  });
});

describe('chained selects in the new row', () => {
  type Place = { id: number; country: string | null; city: string | null };

  it('loads the children with an empty parent first, then with the picked one', async () => {
    const loader = vi.fn((row: Place) =>
      row.country === 'MA' ? [{ value: 'RBA', label: 'Rabat' }] : [],
    );
    const container = mountPoint();
    const table = new Tadabut<Place>(container, {
      data: [],
      rowId: 'id',
      columns: [
        {
          title: 'Country',
          prop: 'country',
          editor: { type: 'select', options: [{ value: 'MA', label: 'Morocco' }] },
        },
        {
          title: 'City',
          prop: 'city',
          editor: { type: 'select', dependsOn: 'country', options: loader },
        },
      ],
    });

    table.add();
    await settle();
    expect(loader).toHaveBeenLastCalledWith(
      expect.objectContaining({ country: null }),
      expect.anything(),
    );

    const [country, city] = [
      ...container.querySelectorAll('.tdb-row-new select'),
    ] as HTMLSelectElement[];
    // The select maps its options by position.
    (country as HTMLSelectElement).selectedIndex = 0;
    country?.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();

    expect([...(city as HTMLSelectElement).options].map((o) => o.textContent)).toContain('Rabat');
  });
});
