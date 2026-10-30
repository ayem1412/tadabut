import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditSession } from '../../src/editing/session';
import { type Column, type SelectOption, Tadabut } from '../../src/index';

type Row = { id: number; countryId: number | null; regionId: number | null; cityId: number | null };

const row: Row = { id: 1, countryId: 1, regionId: 10, cityId: 100 };

/** A loader you finish by hand. Each call is recorded with the row it got. */
function manualLoader() {
  const calls: {
    row: Row;
    signal: AbortSignal;
    resolve: (list: SelectOption<number>[]) => void;
    reject: (error: unknown) => void;
  }[] = [];

  const options = (loadRow: Row, { signal }: { signal: AbortSignal }) =>
    new Promise<SelectOption<number>[]>((resolve, reject) => {
      calls.push({ row: loadRow, signal, resolve, reject });
    });

  return { options, calls };
}

const countries: SelectOption<number>[] = [
  { value: 1, label: 'Morocco' },
  { value: 2, label: 'France' },
];

/** Lets pending promises finish. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup() {
  const regions = manualLoader();
  const cities = manualLoader();

  const columns: Column<Row>[] = [
    { title: 'ID', prop: 'id' },
    { title: 'Country', prop: 'countryId', editor: { type: 'select', options: countries } },
    {
      title: 'Region',
      prop: 'regionId',
      editor: { type: 'select', dependsOn: 'countryId', options: regions.options },
    },
    {
      title: 'City',
      prop: 'cityId',
      editor: { type: 'select', dependsOn: 'regionId', options: cities.options },
    },
  ];

  const cells = columns.map((column) => ({ column, cell: document.createElement('td') }));
  for (const { cell } of cells) document.body.appendChild(cell);

  const session = new EditSession(row, cells);
  const selects = cells.map(({ cell }) => cell.querySelector('select') as HTMLSelectElement);
  const [, country, region, city] = selects as [
    unknown,
    HTMLSelectElement,
    HTMLSelectElement,
    HTMLSelectElement,
  ];

  return { session, regions, cities, country, region, city, cells };
}

function choose(select: HTMLSelectElement, index: number): void {
  select.selectedIndex = index;
  select.dispatchEvent(new Event('change'));
}

describe('chained selects', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('loads every options function with the row when editing starts', async () => {
    const { session, regions, cities, region } = setup();

    expect(regions.calls[0]?.row).toEqual(row);
    expect(cities.calls[0]?.row).toEqual(row);

    regions.calls[0]?.resolve([{ value: 10, label: 'Rabat-Salé' }]);
    await flush();

    expect(region.selectedIndex).toBe(0);
    expect(session.getRow().regionId).toBe(10);
  });

  it('keeps the values while the options load', () => {
    const { session } = setup();

    expect(session.getRow()).toEqual(row);
  });

  it('clears the whole chain below a change, then reloads it with a clean row', async () => {
    const { session, regions, cities, country } = setup();
    regions.calls[0]?.resolve([{ value: 10, label: 'Rabat-Salé' }]);
    cities.calls[0]?.resolve([{ value: 100, label: 'Rabat' }]);
    await flush();

    choose(country, 1);

    expect(session.getRow()).toEqual({ id: 1, countryId: 2, regionId: null, cityId: null });
    expect(regions.calls[1]?.row).toEqual({ id: 1, countryId: 2, regionId: null, cityId: null });
    expect(cities.calls[1]?.row).toEqual({ id: 1, countryId: 2, regionId: null, cityId: null });
  });

  it('only clears below the field that changed', async () => {
    const { session, regions, cities, region } = setup();
    regions.calls[0]?.resolve([
      { value: 10, label: 'Rabat-Salé' },
      { value: 11, label: 'Casablanca-Settat' },
    ]);
    cities.calls[0]?.resolve([{ value: 100, label: 'Rabat' }]);
    await flush();

    choose(region, 1);

    expect(session.getRow()).toEqual({ id: 1, countryId: 1, regionId: 11, cityId: null });
    expect(regions.calls).toHaveLength(1);
    expect(cities.calls[1]?.row.regionId).toBe(11);
  });

  it('stops the old load when the field changes again', async () => {
    const { regions, country } = setup();

    choose(country, 1);

    expect(regions.calls[0]?.signal.aborted).toBe(true);
    expect(regions.calls[1]?.signal.aborted).toBe(false);
  });

  it('shows an error under a select whose options failed, and keeps it on validate', async () => {
    const { session, regions, cells } = setup();

    regions.calls[0]?.reject(new Error('Failed to fetch'));
    await flush();

    const regionCell = cells[2]?.cell as HTMLTableCellElement;
    expect(regionCell.querySelector('.tdb-error')?.textContent).toBe('Could not load the options.');
    expect(session.validate().get('regionId')).toBe('Could not load the options.');

    session.showErrors(session.validate());

    expect(regionCell.querySelectorAll('.tdb-error')).toHaveLength(1);
  });

  it('removes the load error once a reload works', async () => {
    const { session, regions, country, cells } = setup();
    regions.calls[0]?.reject(new Error('Failed to fetch'));
    await flush();

    choose(country, 1);
    regions.calls[1]?.resolve([{ value: 20, label: 'Île-de-France' }]);
    await flush();

    expect(cells[2]?.cell.querySelector('.tdb-error')).toBeNull();
    expect(session.validate().has('regionId')).toBe(false);
  });

  it('keeps other errors when a load fails', async () => {
    const { session, regions, cities, cells } = setup();
    cities.calls[0]?.resolve([]);
    await flush();
    session.showErrors(new Map([['cityId', 'Pick a city.']]));

    regions.calls[0]?.reject(new Error('Failed to fetch'));
    await flush();

    expect(cells[3]?.cell.querySelector('.tdb-error')?.textContent).toBe('Pick a city.');
    expect(cells[2]?.cell.querySelector('.tdb-error')).not.toBeNull();
  });

  it('stops every load on destroy, and ignores late answers', async () => {
    const { session, regions, cities, cells } = setup();

    session.destroy();
    regions.calls[0]?.reject(new Error('late'));
    await flush();

    expect(regions.calls[0]?.signal.aborted).toBe(true);
    expect(cities.calls[0]?.signal.aborted).toBe(true);
    expect(cells[2]?.cell.querySelector('.tdb-error')).toBeNull();
  });

  it('clears every select that depends on the same field', () => {
    type Two = {
      id: number;
      countryId: number | null;
      regionId: number | null;
      zoneId: number | null;
    };
    const columns: Column<Two>[] = [
      { title: 'Country', prop: 'countryId', editor: { type: 'select', options: countries } },
      {
        title: 'Region',
        prop: 'regionId',
        editor: {
          type: 'select',
          dependsOn: 'countryId',
          options: () => [{ value: 10, label: 'R' }],
        },
      },
      {
        title: 'Zone',
        prop: 'zoneId',
        editor: {
          type: 'select',
          dependsOn: 'countryId',
          options: () => [{ value: 5, label: 'Z' }],
        },
      },
    ];
    const cells = columns.map((column) => ({ column, cell: document.createElement('td') }));
    const session = new EditSession<Two>({ id: 1, countryId: 1, regionId: 10, zoneId: 5 }, cells);
    expect(session.getRow()).toEqual({ id: 1, countryId: 1, regionId: 10, zoneId: 5 });

    choose(cells[0]?.cell.querySelector('select') as HTMLSelectElement, 1);

    expect(session.getRow()).toEqual({ id: 1, countryId: 2, regionId: null, zoneId: null });
  });

  it('does not hang when two selects depend on each other', () => {
    type Loop = { id: number; a: number | null; b: number | null };
    const columns: Column<Loop>[] = [
      {
        title: 'A',
        prop: 'a',
        editor: { type: 'select', dependsOn: 'b', options: () => countries },
      },
      {
        title: 'B',
        prop: 'b',
        editor: { type: 'select', dependsOn: 'a', options: () => countries },
      },
    ];
    const cells = columns.map((column) => ({ column, cell: document.createElement('td') }));
    const session = new EditSession<Loop>({ id: 1, a: 1, b: 1 }, cells);

    choose(cells[0]?.cell.querySelector('select') as HTMLSelectElement, 1);

    expect(session.getRow()).toEqual({ id: 1, a: 2, b: null });
  });
});

describe('chained selects in a table', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  type Place = { id: number; country: string; city: string };

  const citiesOf: Record<string, string[]> = {
    Morocco: ['Rabat', 'Fès'],
    France: ['Paris', 'Lyon'],
  };

  function setupTable() {
    const onSave = vi.fn((_row: Place) => {});
    const container = document.createElement('div');
    document.body.appendChild(container);

    const table = new Tadabut<Place>(container, {
      data: [{ id: 1, country: 'Morocco', city: 'Fès' }],
      rowId: 'id',
      onSave,
      columns: [
        { title: 'ID', prop: 'id' },
        {
          title: 'Country',
          prop: 'country',
          editor: {
            type: 'select',
            options: [
              { value: 'Morocco', label: 'Morocco' },
              { value: 'France', label: 'France' },
            ],
          },
        },
        {
          title: 'City',
          prop: 'city',
          editor: {
            type: 'select',
            required: true,
            dependsOn: 'country',
            options: async (row) =>
              (citiesOf[row.country] ?? []).map((city) => ({ value: city, label: city })),
          },
        },
      ],
    });

    const selects = () =>
      [...container.querySelectorAll<HTMLSelectElement>('tbody select')] as [
        HTMLSelectElement,
        HTMLSelectElement,
      ];

    return { table, container, selects, onSave };
  }

  it('opens with the row city picked among its country cities', async () => {
    const { table, selects } = setupTable();

    table.edit(1);
    await flush();

    const [, city] = selects();
    expect([...city.options].map((option) => option.textContent)).toEqual(['Rabat', 'Fès']);
    expect(city.value).toBe('Fès');
  });

  it('blocks saving until a city of the new country is picked, then saves both', async () => {
    const { table, container, selects, onSave } = setupTable();
    table.edit(1);
    await flush();

    choose(selects()[0], 1);
    await flush();

    expect(await table.save(1)).toBe(false);
    expect(container.querySelector('.tdb-error')?.textContent).toBe('This field is required.');

    choose(selects()[1], 1);

    expect(await table.save(1)).toBe(true);
    expect(onSave).toHaveBeenCalledWith(
      { id: 1, country: 'France', city: 'Lyon' },
      expect.anything(),
    );
    expect(container.querySelector('tbody td:nth-child(3)')?.textContent).toBe('Lyon');
  });

  it('stops loading when the row is cancelled', async () => {
    let signal: AbortSignal | undefined;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const table = new Tadabut<Place>(container, {
      data: [{ id: 1, country: 'Morocco', city: 'Fès' }],
      rowId: 'id',
      columns: [
        {
          title: 'City',
          prop: 'city',
          editor: {
            type: 'select',
            options: (_row, context) => {
              signal = context.signal;
              return new Promise(() => {});
            },
          },
        },
      ],
    });

    table.edit(1);
    table.cancel(1);

    expect(signal?.aborted).toBe(true);
  });
});
