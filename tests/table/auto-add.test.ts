import { describe, expect, it, vi } from 'vitest';

import { type Column, Tadabut, type TadabutOptions } from '../../src/index';
import { mountPoint, type, waiting } from '../helpers';

type Row = { id: number; name: string; country: string };

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
  { title: 'Country', prop: 'country', editor: { type: 'text' } },
];

function rows(): Row[] {
  return [
    { id: 1, name: 'Amina', country: 'MA' },
    { id: 2, name: 'Karim', country: 'MA' },
  ];
}

let nextId = 10;

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    autoAdd: true,
    onSave: (row) => row,
    onAdd: (row) => ({ ...row, id: nextId++ }) as Row,
    ...options,
  });

  /** The new row's inputs, in column order. */
  const newInputs = () => [...container.querySelectorAll<HTMLInputElement>('.tdb-row-new input')];

  return { container, table, newInputs };
}

describe('the option', () => {
  it('is off by default', () => {
    const { table } = setup({ autoAdd: undefined });

    expect(table.isAdding()).toBe(false);
  });

  it('needs a column with an editor', () => {
    expect(
      () =>
        new Tadabut(mountPoint(), {
          data: rows(),
          columns: [{ title: 'Name', prop: 'name' }],
          autoAdd: true,
        }),
    ).toThrow('Tadabut: autoAdd needs a column with an editor.');
  });

  it('opens the new row once the table is built, without moving the cursor', () => {
    const { table } = setup();

    expect(table.isAdding()).toBe(true);
    expect(document.activeElement).toBe(document.body);
  });

  it('starts with the values you gave it, and never changes your object', async () => {
    const start = { country: 'FR' };
    const { table, newInputs } = setup({ autoAdd: start });

    expect(newInputs()[1]?.value).toBe('FR');

    type(newInputs()[0] as HTMLInputElement, 'Nadia');
    await table.saveNew();

    expect(start).toEqual({ country: 'FR' });
    expect(newInputs()[1]?.value).toBe('FR');
  });
});

describe('when it opens again', () => {
  it('opens a fresh one after a successful add, with the cursor in it', async () => {
    const onAdded = vi.fn();
    const { table, newInputs } = setup({ onAdded });
    type(newInputs()[0] as HTMLInputElement, 'Nadia');

    expect(await table.saveNew()).toBe(true);

    expect(onAdded).toHaveBeenCalled();
    expect(table.isAdding()).toBe(true);
    expect(newInputs()[0]?.value).toBe('');
    expect(document.activeElement).toBe(newInputs()[0]);
  });

  it('is already open again inside onAdded', async () => {
    let addingInside = false;
    const { table, newInputs } = setup({ onAdded: () => (addingInside = table.isAdding()) });
    type(newInputs()[0] as HTMLInputElement, 'Nadia');

    await table.saveNew();

    expect(addingInside).toBe(true);
  });

  it('keeps the failed row open, with what was typed', async () => {
    const { table, newInputs } = setup({
      onAdd: () => {
        throw new Error('Server down');
      },
    });
    type(newInputs()[0] as HTMLInputElement, 'Nadia');

    expect(await table.saveNew()).toBe(false);

    expect(newInputs()[0]?.value).toBe('Nadia');
  });

  it('opens again after setData, and drops what was typed', () => {
    const { table, newInputs } = setup();
    type(newInputs()[0] as HTMLInputElement, 'Typed');

    table.setData(rows());

    expect(table.isAdding()).toBe(true);
    expect(newInputs()[0]?.value).toBe('');
  });

  it('stays closed after Cancel, until the next setData', () => {
    const { table } = setup();

    table.cancelNew();
    table.edit(1);
    table.cancel(1);

    expect(table.isAdding()).toBe(false);

    table.setData(rows());

    expect(table.isAdding()).toBe(true);
  });

  it('waits while editing is off, and opens when it comes back', () => {
    const { table } = setup({ editable: false });

    expect(table.isAdding()).toBe(false);

    table.setData(rows());

    expect(table.isAdding()).toBe(false);

    table.setEditable(true);

    expect(table.isAdding()).toBe(true);
  });
});

describe("in 'single' mode", () => {
  it('makes way for Edit, and comes back after Save', async () => {
    const { table } = setup();

    expect(table.edit(1)).toBe(true);
    expect(table.isAdding()).toBe(false);

    await table.save(1);

    expect(table.isAdding()).toBe(true);
  });

  it('comes back after Cancel, without moving the cursor', () => {
    const { table } = setup();
    table.edit(1);

    table.cancel(1);

    expect(table.isAdding()).toBe(true);
    expect(document.activeElement).toBe(document.body);
  });

  it('stays when Edit is refused', () => {
    const { table } = setup({ onEditStart: () => false });

    expect(table.edit(1)).toBe(false);

    expect(table.isAdding()).toBe(true);
  });

  it('keeps what was typed when Edit is refused', () => {
    const { table, newInputs } = setup({ onEditStart: () => false });
    type(newInputs()[0] as HTMLInputElement, 'Nadia');

    expect(table.edit(1)).toBe(false);

    expect(newInputs()[0]?.value).toBe('Nadia');
  });

  it('keeps what was typed when Edit gets an id that is not in the table', () => {
    const { table, newInputs } = setup();
    type(newInputs()[0] as HTMLInputElement, 'Nadia');

    expect(table.edit(99)).toBe(false);

    expect(newInputs()[0]?.value).toBe('Nadia');
  });

  it('still comes back after Save when a second Edit was refused', async () => {
    const { table } = setup();
    table.edit(1);

    expect(table.edit(2)).toBe(false);

    await table.save(1);

    expect(table.isAdding()).toBe(true);
  });

  it("doesn't make way while it's saving", () => {
    const onAdd = waiting<Row>();
    const { table, newInputs } = setup({ onAdd: onAdd.fn });
    type(newInputs()[0] as HTMLInputElement, 'Nadia');
    void table.saveNew();

    expect(table.edit(1)).toBe(false);
    expect(table.isAdding()).toBe(true);
  });

  it('still lets a row opened with add() block Edit, like without autoAdd', () => {
    const { table } = setup();
    table.cancelNew();
    table.add();

    expect(table.edit(1)).toBe(false);
    expect(table.isAdding()).toBe(true);
  });

  it('comes back once editing is turned off and on again mid-edit', () => {
    const { table } = setup();
    table.edit(1);

    table.setEditable(false);

    expect(table.isAdding()).toBe(false);

    table.setEditable(true);

    expect(table.isAdding()).toBe(true);
  });
});

describe("in 'multiple' mode", () => {
  it('stays open while rows are edited', () => {
    const { table } = setup({ editing: { mode: 'multiple' } });

    expect(table.edit(1)).toBe(true);
    expect(table.edit(2)).toBe(true);
    expect(table.isAdding()).toBe(true);
  });
});
