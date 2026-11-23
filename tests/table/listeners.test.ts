import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { type Column, Tadabut, type TadabutOptions } from '../../src/index';
import { Listeners } from '../../src/table/events';
import { mountPoint, type } from '../helpers';

type Row = { id: number; name: string };

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
];

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const table = new Tadabut(container, {
    data: [
      { id: 1, name: 'Amina' },
      { id: 2, name: 'Karim' },
    ],
    rowId: 'id',
    columns,
    onSave: (row) => row,
    onAdd: (row) => ({ ...row, id: 99 }) as Row,
    onDelete: () => {},
    confirmDelete: false,
    selection: true,
    currentRow: true,
    dataTables: { order: [] },
    ...options,
  });

  /** The name cell of the nth row shown, from 0. */
  const nameCell = (index: number) =>
    container.querySelectorAll('tbody tr')[index]?.querySelectorAll('td')[2] as HTMLElement;

  const input = () => container.querySelector<HTMLInputElement>('.tdb-input') as HTMLInputElement;

  return { container, table, nameCell, input };
}

let consoleError: MockInstance;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('table.on', () => {
  it('hears all 7 events, with the same arguments as the options', async () => {
    const heard: string[] = [];
    const { table, nameCell, input } = setup();

    table.on('saved', (row, { previous }) => heard.push(`saved ${previous.name} → ${row.name}`));
    table.on('added', (row) => heard.push(`added ${row.id}`));
    table.on('deleted', (row) => heard.push(`deleted ${row.id}`));
    table.on('select', (rows) => heard.push(`select ${rows.map((row) => row.id).join(',')}`));
    table.on('currentChange', (row) => heard.push(`current ${row?.id ?? 'none'}`));
    table.on('rowClick', (row, event) => heard.push(`click ${row.id} ${event.type}`));
    table.on('rowDoubleClick', (row, event) => heard.push(`dblclick ${row.id} ${event.type}`));

    table.edit(1);
    type(input(), 'Nadia');
    await table.save(1);
    table.add();
    type(input(), 'New');
    await table.saveNew();
    await table.delete(2);
    table.select([1]);
    nameCell(0).click();
    nameCell(0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(heard).toEqual([
      'saved Amina → Nadia',
      'added 99',
      'deleted 2',
      'select 1',
      'current 1',
      'click 1 click',
      'dblclick 1 dblclick',
    ]);
  });

  it('calls the option first, then the listeners in the order they were added', async () => {
    const order: string[] = [];
    const { table } = setup({ onDeleted: () => order.push('option') });
    table.on('deleted', () => order.push('first'));
    table.on('deleted', () => order.push('second'));

    await table.delete(1);

    expect(order).toEqual(['option', 'first', 'second']);
  });

  it('stops with the function on returns, or with off', async () => {
    const stopped = vi.fn();
    const removed = vi.fn();
    const kept = vi.fn();
    const { table } = setup();
    const stop = table.on('deleted', stopped);
    table.on('deleted', removed);
    table.on('deleted', kept);

    stop();
    table.off('deleted', removed);
    await table.delete(1);

    expect(stopped).not.toHaveBeenCalled();
    expect(removed).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
  });

  it('runs the same function once, even if it was added twice', async () => {
    const listener = vi.fn();
    const { table } = setup();
    table.on('deleted', listener);
    table.on('deleted', listener);

    await table.delete(1);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps going when a listener throws, and shows the error', async () => {
    const after = vi.fn();
    const { table } = setup();
    table.on('deleted', () => {
      throw new Error('Broken listener');
    });
    table.on('deleted', after);

    expect(await table.delete(1)).toBe(true);

    expect(after).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(new Error('Broken listener'));
    expect(table.getRow(1)).toBeUndefined();
  });

  it('lets a listener stop itself while the event runs', async () => {
    const other = vi.fn();
    const { table } = setup();
    const stop = table.on('deleted', () => stop());
    table.on('deleted', other);

    await table.delete(1);
    await table.delete(2);

    expect(other).toHaveBeenCalledTimes(2);
  });

  it('forgets every listener on destroy', () => {
    const listener = vi.fn();
    const { table } = setup();
    table.on('select', listener);

    table.destroy();
    table.select([1]);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('Listeners', () => {
  it('does nothing for an event nobody listens to', () => {
    const listeners = new Listeners<Row>();

    expect(() => listeners.emit('added', { id: 1, name: 'A' })).not.toThrow();
  });

  it('uses reportError when the browser has it', () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    const listeners = new Listeners<Row>();
    listeners.on('added', () => {
      throw new Error('Boom');
    });

    listeners.emit('added', { id: 1, name: 'A' });

    expect(reportError).toHaveBeenCalledWith(new Error('Boom'));
    expect(consoleError).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
