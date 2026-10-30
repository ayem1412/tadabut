import type { Column } from '../src/index';

export type Row = {
  id: number;
  name: string;
  country: string;
  city: string;
  age: number;
};

export const rows: Row[] = [
  { id: 1, name: 'Amina Benali', country: 'Morocco', city: 'Rabat', age: 29 },
  { id: 2, name: 'Youness Idrissi', country: 'Morocco', city: 'Casablanca', age: 34 },
  { id: 3, name: 'Salma Ait Ouahmane', country: 'Morocco', city: 'Agadir', age: 25 },
  { id: 4, name: 'Karim El Fassi', country: 'Morocco', city: 'Fès', age: 41 },
  { id: 5, name: 'Nadia Amrani', country: 'Morocco', city: 'Tanger', age: 37 },
  { id: 6, name: 'Hamza Ouchen', country: 'Morocco', city: 'Marrakech', age: 22 },
  { id: 7, name: 'Leila Berrada', country: 'Morocco', city: 'Meknès', age: 31 },
  { id: 8, name: 'Omar Tazi', country: 'Morocco', city: 'Oujda', age: 45 },
  { id: 9, name: 'Ilham Zerouali', country: 'Morocco', city: 'Tétouan', age: 28 },
  { id: 10, name: 'Mehdi Alaoui', country: 'Morocco', city: 'Kénitra', age: 33 },
  { id: 11, name: 'Sara Lahlou', country: 'France', city: 'Paris', age: 26 },
  { id: 12, name: 'Anass Bennani', country: 'Spain', city: 'Madrid', age: 39 },
];

/** What the fake server knows. Atlantis is here so its cities fail to load. */
const citiesByCountry: Record<string, string[]> = {
  Morocco: [
    'Agadir',
    'Casablanca',
    'Fès',
    'Kénitra',
    'Marrakech',
    'Meknès',
    'Oujda',
    'Rabat',
    'Tanger',
    'Tétouan',
  ],
  France: ['Lyon', 'Marseille', 'Paris', 'Toulouse'],
  Spain: ['Barcelona', 'Madrid', 'Sevilla', 'Valencia'],
  Atlantis: [],
};

const countries = Object.keys(citiesByCountry);

/** Waits `ms`, or stops early with an error when `signal` is aborted. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

/**
 * A fake city request: takes half a second, uses `signal` like `fetch`
 * would, and fails for Atlantis.
 */
async function fetchCities(country: string, signal: AbortSignal): Promise<string[]> {
  await wait(500, signal);

  if (country === 'Atlantis') {
    throw new Error('The server has no cities for Atlantis');
  }

  return citiesByCountry[country] ?? [];
}

export const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  {
    title: 'Name',
    prop: 'name',
    editor: { type: 'text', required: true, maxLength: 50 },
  },
  {
    title: 'Country',
    prop: 'country',
    editor: {
      type: 'select',
      options: countries.map((country) => ({ value: country, label: country })),
    },
  },
  {
    title: 'City',
    prop: 'city',
    editor: {
      type: 'select',
      required: true,
      dependsOn: 'country',
      options: async (row, { signal }) => {
        const cities = await fetchCities(row.country, signal);
        return cities.map((city) => ({ value: city, label: city }));
      },
    },
  },
  { title: 'Age', prop: 'age', editor: { type: 'number', min: 18, max: 99 } },
];

/** A fake server for both pages: takes 1 second, and refuses the name "error". */
export async function fakeSave(row: Row): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (row.name.toLowerCase() === 'error') {
    throw new Error('The server refused this name');
  }
}
