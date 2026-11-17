import { describe, expect, it, vi } from 'vitest';

import { type Column, fr, Tadabut, type TadabutOptions } from '../../src/index';
import { mountPoint, search, type } from '../helpers';

type Row = { id: number; name: string; at: string | null; when: string | null };

const rows: Row[] = [
  { id: 1, name: 'Amina', at: '14:30', when: '05/06/2024 09:00' },
  { id: 2, name: 'Youness', at: '9:05', when: '05/01/2024 14:30' },
  { id: 3, name: 'Salma', at: '08:00:30', when: '05/01/2024 08:15' },
  { id: 4, name: 'Karim', at: null, when: null },
];

const at: Column<Row> = { title: 'At', prop: 'at', editor: { type: 'time' } };
const when: Column<Row> = {
  title: 'When',
  prop: 'when',
  editor: { type: 'datetime', format: 'dd/mm/yyyy' },
};

function setup(columns: Column<Row>[], options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const onSave = vi.fn();
  const table = new Tadabut(container, {
    data: rows,
    rowId: 'id',
    columns: [{ title: 'Name', prop: 'name' }, ...columns],
    onSave,
    // Keep the rows in data order.
    dataTables: { order: [] },
    ...options,
  });

  const cells = () =>
    [...container.querySelectorAll('tbody tr')].map(
      (tr) => tr.querySelectorAll('td')[1]?.textContent,
    );
  const names = () =>
    [...container.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('td')?.textContent);
  /** The error under the edited field, if any. */
  const error = () => container.querySelector('.tdb-error')?.textContent ?? null;

  return { container, table, onSave, cells, names, error };
}

describe('time cells', () => {
  it('show hh:mm, whatever the data looks like', () => {
    const { cells } = setup([at]);

    expect(cells()).toEqual(['14:30', '09:05', '08:00', '']);
  });

  it('show the seconds with seconds', () => {
    const { cells } = setup([{ ...at, editor: { type: 'time', seconds: true } }]);

    expect(cells()).toEqual(['14:30:00', '09:05:00', '08:00:30', '']);
  });

  it('show a value that is not a time as it is', () => {
    const { cells } = setup([at], { data: [{ id: 1, name: 'A', at: '25:00', when: null }] });

    expect(cells()).toEqual(['25:00']);
  });

  it('sort by the real time, empty first', () => {
    const { names } = setup([at], { dataTables: { order: [[1, 'asc']] } });

    // As text, "9:05" would come after "14:30".
    expect(names()).toEqual(['Karim', 'Salma', 'Youness', 'Amina']);
  });
});

describe('date-time cells', () => {
  it('show the date in display, then the time, with a space', () => {
    const { cells } = setup([
      { ...when, editor: { type: 'datetime', format: 'dd/mm/yyyy', display: 'dd.mm.yyyy' } },
    ]);

    expect(cells()).toEqual(['05.06.2024 09:00', '05.01.2024 14:30', '05.01.2024 08:15', '']);
  });

  it('show ISO data with a space, not a T', () => {
    const { cells } = setup([{ ...when, editor: { type: 'datetime' } }], {
      data: [{ id: 1, name: 'A', at: null, when: '2024-01-05T14:30:00.000Z' }],
    });

    expect(cells()).toEqual(['2024-01-05 14:30']);
  });

  it('sort by the real date and time, empty first', () => {
    const { names } = setup([when], { dataTables: { order: [[1, 'asc']] } });

    expect(names()).toEqual(['Karim', 'Salma', 'Youness', 'Amina']);
  });

  it('can be searched as they show', () => {
    const { container, names } = setup([when]);

    search(container, '05/01/2024 14');

    expect(names()).toEqual(['Youness']);
  });
});

describe('saving', () => {
  it('gives onSave the time as hh:mm', async () => {
    const { table, container, onSave } = setup([at]);

    table.edit(2);
    type(container.querySelector<HTMLInputElement>('.tdb-input-time') as HTMLInputElement, '16:45');
    await table.save(2);

    expect(onSave.mock.lastCall?.[0]).toEqual(expect.objectContaining({ at: '16:45' }));
  });

  it('gives onSave the date-time written like the data', async () => {
    const { table, container, onSave, cells } = setup([when]);

    table.edit(2);
    type(
      container.querySelector<HTMLInputElement>('.tdb-input-datetime') as HTMLInputElement,
      '2024-02-29T10:15',
    );
    await table.save(2);

    expect(onSave.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({ when: '29/02/2024 10:15' }),
    );
    expect(cells()[1]).toBe('29/02/2024 10:15');
  });
});

describe('min and max', () => {
  it('refuse a time out of range', async () => {
    const { table, container, onSave, error } = setup([
      { ...at, editor: { type: 'time', min: '08:00', max: '18:00' } },
    ]);
    const input = () =>
      container.querySelector<HTMLInputElement>('.tdb-input-time') as HTMLInputElement;

    table.edit(2);
    type(input(), '07:30');
    await table.save(2);

    expect(onSave).not.toHaveBeenCalled();
    expect(error()).toBe('Must be at or after 08:00.');

    type(input(), '18:30');
    await table.save(2);

    expect(error()).toBe('Must be at or before 18:00.');
  });

  it('translate the time messages', async () => {
    const { table, container, error } = setup([{ ...at, editor: { type: 'time', min: '08:00' } }], {
      texts: fr,
    });

    table.edit(2);
    type(container.querySelector<HTMLInputElement>('.tdb-input-time') as HTMLInputElement, '07:30');
    await table.save(2);

    expect(error()).toBe('Doit être à 08:00 ou après.');
  });

  it('refuse a date-time out of range, and show the limit like the cells', async () => {
    const { table, container, onSave, error } = setup([
      {
        ...when,
        editor: {
          type: 'datetime',
          format: 'dd/mm/yyyy',
          display: 'dd.mm.yyyy',
          min: '01/01/2024 08:00',
        },
      },
    ]);

    table.edit(2);
    type(
      container.querySelector<HTMLInputElement>('.tdb-input-datetime') as HTMLInputElement,
      '2024-01-01T07:59',
    );
    await table.save(2);

    expect(onSave).not.toHaveBeenCalled();
    expect(error()).toBe('Must be on or after 01.01.2024 08:00.');
  });

  it('accept the limits themselves', async () => {
    const { table, container, onSave } = setup([
      { ...when, editor: { type: 'datetime', format: 'dd/mm/yyyy', min: '01/01/2024 08:00' } },
    ]);

    table.edit(2);
    type(
      container.querySelector<HTMLInputElement>('.tdb-input-datetime') as HTMLInputElement,
      '2024-01-01T08:00',
    );
    await table.save(2);

    expect(onSave).toHaveBeenCalled();
  });

  it('throw when a time limit is not a real time', () => {
    expect(() => setup([{ ...at, editor: { type: 'time', min: '8h' } }])).toThrow(
      'the "at" column\'s time "8h" isn\'t a real time',
    );
  });

  it('throw when a date-time limit is not written in format', () => {
    expect(() =>
      setup([
        { ...when, editor: { type: 'datetime', format: 'dd/mm/yyyy', max: '2024-12-31 18:00' } },
      ]),
    ).toThrow('"2024-12-31 18:00" isn\'t real, or isn\'t written as dd/mm/yyyy hh:mm');
  });
});
