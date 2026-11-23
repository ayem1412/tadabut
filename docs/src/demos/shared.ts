import 'datatables.net-dt';
import 'datatables.net-dt/css';

import type { DataTablesSettings, SelectOption, TadabutOptions } from '../../../src/index';

/** One employee. Every demo uses these, and shows only the columns it needs. */
export type Employee = {
  id: number;
  name: string;
  age: number | null;
  /** `'yyyy-mm-dd'`. */
  hiredAt: string | null;
  /** `'hh:mm'`. */
  starts: string | null;
  /** `'yyyy-mm-ddThh:mm'`. */
  lastLogin: string | null;
  active: boolean;
  country: string;
  cityId: number | null;
  cityName: string | null;
  salary: number | null;
  status: string;
};

/** A fresh copy each time, so one demo's edits don't show up in another. */
export function employees(): Employee[] {
  return [
    {
      id: 1,
      name: 'Amina Benali',
      age: 34,
      hiredAt: '2019-03-11',
      starts: '08:30',
      lastLogin: '2026-11-20T09:12',
      active: true,
      country: 'MA',
      cityId: 1,
      cityName: 'Rabat',
      salary: 12500,
      status: 'Working',
    },
    {
      id: 2,
      name: 'Lucas Martin',
      age: 41,
      hiredAt: '2015-09-01',
      starts: '09:00',
      lastLogin: '2026-11-18T17:45',
      active: false,
      country: 'FR',
      cityId: 5,
      cityName: 'Lyon',
      salary: 9800.5,
      status: 'On leave',
    },
    {
      id: 3,
      name: 'Awa Diop',
      age: 29,
      hiredAt: '2022-01-17',
      starts: '10:00',
      lastLogin: '2026-11-21T11:03',
      active: true,
      country: 'SN',
      cityId: 6,
      cityName: 'Dakar',
      salary: 15000,
      status: 'Working',
    },
    {
      id: 4,
      name: 'Youssef Alaoui',
      age: 52,
      hiredAt: '2008-06-02',
      starts: '07:45',
      lastLogin: '2026-11-21T08:20',
      active: true,
      country: 'MA',
      cityId: 2,
      cityName: 'Casablanca',
      salary: 18200,
      // Looks like HTML on purpose: the badge demo shows it as plain text.
      status: '<b>Remote</b>',
    },
  ];
}

/** The countries, as select options. */
export const countries: SelectOption<string>[] = [
  { value: 'MA', label: 'Morocco' },
  { value: 'FR', label: 'France' },
  { value: 'SN', label: 'Senegal' },
];

/** The cities of each country, as if they came from a server. */
export const cities: Record<string, SelectOption<number>[]> = {
  MA: [
    { value: 1, label: 'Rabat' },
    { value: 2, label: 'Casablanca' },
    { value: 3, label: 'Marrakech' },
  ],
  FR: [
    { value: 4, label: 'Paris' },
    { value: 5, label: 'Lyon' },
  ],
  SN: [
    { value: 6, label: 'Dakar' },
    { value: 7, label: 'Saint-Louis' },
  ],
};

/** Waits a little, like a server would. */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Small tables: no paging, search or "Showing 1 to 4" line, and the rows in
 * their own order. No `autoWidth`, so the checkbox and ▸ columns can stay narrow.
 */
export const small: DataTablesSettings = {
  paging: false,
  searching: false,
  info: false,
  order: [],
  autoWidth: false,
};

/** The box around one demo, made by the page. */
export type DemoBox = {
  /** Where the table goes. */
  readonly table: HTMLElement;
  /** Shows a line of text next to the buttons. */
  readonly status: (text: string) => void;
  /** Adds a button next to the status. */
  readonly button: (label: string, onClick: () => void) => HTMLButtonElement;
  /** Shows what to try, under the table. */
  readonly hint: (text: string) => void;
};

/** What every demo file exports: it builds its table in the box. */
export type Demo = (box: DemoBox) => void;

/**
 * A pretend server: saving, adding and deleting wait a little, and the status
 * says what happened. Saving a name of "error" fails, to show the message.
 */
export function fakeServer(
  box: DemoBox,
): Pick<
  TadabutOptions<Employee>,
  'onSave' | 'onAdd' | 'onDelete' | 'onSaved' | 'onAdded' | 'onDeleted'
> {
  /** Ids for added rows, after the ones in `employees`. */
  let nextId = 5;

  return {
    onSave: async (row) => {
      await wait(400);

      if (row.name.trim().toLowerCase() === 'error') {
        throw new Error('The server said no. Try another name.');
      }

      return row;
    },
    onAdd: async (row) => {
      await wait(400);
      return { ...row, id: nextId++ } as Employee;
    },
    onDelete: () => wait(300),
    onSaved: (row) => box.status(`Saved ${row.name}.`),
    onAdded: (row) => box.status(`Added ${row.name}.`),
    onDeleted: (row) => box.status(`Deleted ${row.name}.`),
  };
}
