import type { Column, DataTablesSettings } from '../src/index';

export type Row = {
  id: number;
  name: string;
  /** A country code, like 'MA'. The cell shows its label, like "Morocco". */
  country: string;
  city: string;
  age: number;
};

export const rows: Row[] = [
  { id: 1, name: 'Amina Benali', country: 'MA', city: 'Rabat', age: 29 },
  { id: 2, name: 'Youness Idrissi', country: 'MA', city: 'Casablanca', age: 34 },
  { id: 3, name: 'Salma Ait Ouahmane', country: 'MA', city: 'Agadir', age: 25 },
  { id: 4, name: 'Karim El Fassi', country: 'MA', city: 'Fès', age: 41 },
  { id: 5, name: 'Nadia Amrani', country: 'MA', city: 'Tanger', age: 37 },
  { id: 6, name: 'Hamza Ouchen', country: 'MA', city: 'Marrakech', age: 22 },
  { id: 7, name: 'Leila Berrada', country: 'MA', city: 'Meknès', age: 31 },
  { id: 8, name: 'Omar Tazi', country: 'MA', city: 'Oujda', age: 45 },
  { id: 9, name: 'Ilham Zerouali', country: 'MA', city: 'Tétouan', age: 28 },
  { id: 10, name: 'Mehdi Alaoui', country: 'MA', city: 'Kénitra', age: 33 },
  { id: 11, name: 'Sara Lahlou', country: 'FR', city: 'Paris', age: 26 },
  { id: 12, name: 'Anass Bennani', country: 'ES', city: 'Madrid', age: 39 },
];

/** The countries, by code. Atlantis is here so its cities fail to load. */
export const countries: { value: string; label: string }[] = [
  { value: 'MA', label: 'Morocco' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'XX', label: 'Atlantis' },
];

/** What the fake server knows, by country code. */
const citiesByCountry: Record<string, string[]> = {
  MA: [
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
  FR: ['Lyon', 'Marseille', 'Paris', 'Toulouse'],
  ES: ['Barcelona', 'Madrid', 'Sevilla', 'Valencia'],
  XX: [],
};

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
export async function fetchCities(country: string, signal: AbortSignal): Promise<string[]> {
  await wait(500, signal);

  if (country === 'XX') {
    throw new Error('The server has no cities for Atlantis');
  }

  return citiesByCountry[country] ?? [];
}

export const columns: Column<Row>[] = [
  // A narrow, centered column. `dt-center` comes with DataTables' own CSS.
  { title: 'ID', prop: 'id', width: '60px', className: 'dt-center' },
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
      // A fixed list: the cell shows "Morocco" for 'MA' by itself.
      options: countries,
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
  {
    title: 'Age',
    prop: 'age',
    editor: { type: 'number', min: 18, max: 99 },
    // Only the text changes: the column still sorts by number.
    render: (value) => `${value} years`,
  },
];

/** A fake server for both pages: takes 1 second, and refuses the name "error". */
export async function fakeSave(row: Row): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (row.name.toLowerCase() === 'error') {
    throw new Error('The server refused this name');
  }
}

/**
 * DataTables settings shared by the pages: sort by name, and more page sizes.
 * A constant, so the React page doesn't rebuild the table on every render.
 */
export const settings: DataTablesSettings = {
  order: [[1, 'asc']],
  lengthMenu: [5, 10, 20, -1],
};

/** DataTables' texts in French, to try `language`. */
export const french: DataTablesSettings['language'] = {
  search: 'Rechercher:',
  lengthMenu: '_MENU_ lignes par page',
  info: 'Lignes _START_ à _END_ sur _TOTAL_',
  infoEmpty: 'Aucune ligne',
  infoFiltered: '(filtré de _MAX_ lignes)',
  zeroRecords: 'Aucune ligne trouvée',
  emptyTable: 'Aucune donnée',
  // paginate: { first: 'Premier', previous: 'Précédent', next: 'Suivant', last: 'Dernier' },
};
