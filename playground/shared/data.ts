import type { Column, DataTablesSettings } from '../../src/index';

export type Row = {
  id: number;
  name: string;
  /** 'MA', 'FR'… */
  country: string;
  cityId: number | null;
  cityName: string | null;
  age: number;
  /** Monthly, in dirhams. */
  salary: number | null;
  /** 'O' (oui) or 'N' (non), like an old database. `null` when nobody said. */
  active: 'O' | 'N' | null;
  /** 'dd/mm/yyyy', like an old PHP backend sends it. */
  hired: string | null;
};

export const rows: Row[] = [
  {
    id: 1,
    name: 'Amina Benali',
    country: 'MA',
    cityId: 8,
    cityName: 'Rabat',
    age: 29,
    salary: 12500,
    active: 'O',
    hired: '15/03/2019',
  },
  {
    id: 2,
    name: 'Youness Idrissi',
    country: 'MA',
    cityId: 2,
    cityName: 'Casablanca',
    age: 34,
    salary: 9800.5,
    active: 'N',
    hired: '02/11/2021',
  },
  {
    id: 3,
    name: 'Salma Ait Ouahmane',
    country: 'MA',
    cityId: 1,
    cityName: 'Agadir',
    age: 25,
    salary: 15000,
    active: 'O',
    hired: '28/02/2024',
  },
  {
    id: 4,
    name: 'Karim El Fassi',
    country: 'MA',
    cityId: 3,
    cityName: 'Fès',
    age: 41,
    salary: 22750,
    active: null,
    hired: '07/07/2015',
  },
  {
    id: 5,
    name: 'Nadia Amrani',
    country: 'MA',
    cityId: 9,
    cityName: 'Tanger',
    age: 37,
    salary: 8400,
    active: 'O',
    hired: '19/09/2022',
  },
  {
    id: 6,
    name: 'Hamza Ouchen',
    country: 'MA',
    cityId: 5,
    cityName: 'Marrakech',
    age: 22,
    salary: 11200.75,
    active: 'N',
    hired: '01/12/2023',
  },
  {
    id: 7,
    name: 'Leila Berrada',
    country: 'MA',
    cityId: 6,
    cityName: 'Meknès',
    age: 31,
    salary: 30000,
    active: 'O',
    hired: '30/06/2018',
  },
  {
    id: 8,
    name: 'Omar Tazi',
    country: 'MA',
    cityId: 7,
    cityName: 'Oujda',
    age: 45,
    salary: 7600,
    active: null,
    hired: '11/01/2010',
  },
  {
    id: 9,
    name: 'Ilham Zerouali',
    country: 'MA',
    cityId: 10,
    cityName: 'Tétouan',
    age: 28,
    salary: null,
    active: 'O',
    hired: null,
  },
  {
    id: 10,
    name: 'Mehdi Alaoui',
    country: 'MA',
    cityId: 4,
    cityName: 'Kénitra',
    age: 33,
    salary: 18900,
    active: 'N',
    hired: '23/04/2020',
  },
  {
    id: 11,
    name: 'Sara Lahlou',
    country: 'FR',
    cityId: 13,
    cityName: 'Paris',
    age: 26,
    salary: 26400.25,
    active: 'O',
    hired: '05/05/2024',
  },
  {
    id: 12,
    name: 'Anass Bennani',
    country: 'ES',
    cityId: 16,
    cityName: 'Madrid',
    age: 39,
    salary: 14100,
    active: null,
    hired: '14/02/2017',
  },
];

// Atlantis is there to show a failed load.
export const countries: { value: string; label: string }[] = [
  { value: 'MA', label: 'Morocco' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'XX', label: 'Atlantis' },
];

type City = { id: number; name: string };

const citiesByCountry: Record<string, City[]> = {
  MA: [
    { id: 1, name: 'Agadir' },
    { id: 2, name: 'Casablanca' },
    { id: 3, name: 'Fès' },
    { id: 4, name: 'Kénitra' },
    { id: 5, name: 'Marrakech' },
    { id: 6, name: 'Meknès' },
    { id: 7, name: 'Oujda' },
    { id: 8, name: 'Rabat' },
    { id: 9, name: 'Tanger' },
    { id: 10, name: 'Tétouan' },
  ],
  FR: [
    { id: 11, name: 'Lyon' },
    { id: 12, name: 'Marseille' },
    { id: 13, name: 'Paris' },
    { id: 14, name: 'Toulouse' },
  ],
  ES: [
    { id: 15, name: 'Barcelona' },
    { id: 16, name: 'Madrid' },
    { id: 17, name: 'Sevilla' },
    { id: 18, name: 'Valencia' },
  ],
  XX: [],
};

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

// Pretends to be a slow API. Honors `signal` like fetch does.
export async function fetchCities(country: string, signal: AbortSignal): Promise<City[]> {
  await wait(500, signal);

  if (country === 'XX') {
    throw new Error('The server has no cities for Atlantis');
  }

  return citiesByCountry[country] ?? [];
}

/** Classes for the inputs, by kind. The Bootstrap page passes its own. */
export type InputClasses = {
  /** Text, number and money inputs. */
  readonly input?: string;
  /** Selects. */
  readonly select?: string;
  /** Checkboxes. */
  readonly checkbox?: string;
};

/** The playground's columns, the same on every page. Only the input classes change. */
export function makeColumns(classes: InputClasses = {}): Column<Row>[] {
  return [
    { title: 'ID', prop: 'id', width: '60px', className: 'dt-center' },
    {
      title: 'Name',
      prop: 'name',
      editor: { type: 'text', required: true, maxLength: 50, className: classes.input },
    },
    {
      title: 'Country',
      prop: 'country',
      editor: { type: 'select', options: countries, className: classes.select },
    },
    {
      title: 'City',
      prop: 'cityId',
      editor: {
        type: 'select',
        required: true,
        dependsOn: 'country',
        labelProp: 'cityName',
        className: classes.select,
        options: async (row, { signal }) => {
          const cities = await fetchCities(row.country, signal);
          return cities.map((city) => ({ value: city.id, label: city.name }));
        },
      },
    },
    {
      title: 'Age',
      prop: 'age',
      editor: { type: 'number', min: 18, max: 99, className: classes.input },
      render: (value) => `${value} years`,
      total: 'avg',
    },
    {
      title: 'Salary',
      prop: 'salary',
      className: 'dt-right',
      total: 'sum',
      editor: { type: 'money', min: 3000, className: classes.input },
    },
    {
      title: 'Active',
      prop: 'active',
      className: 'dt-center',
      editor: {
        type: 'checkbox',
        values: { checked: 'O', unchecked: 'N' },
        className: classes.checkbox,
      },
      // An untouched null stays null, so it shows as "—".
      render: (value) => (value === 'O' ? 'Yes' : value === 'N' ? 'No' : '—'),
    },
    {
      title: 'Hired',
      prop: 'hired',
      editor: {
        type: 'date',
        format: 'dd/mm/yyyy',
        min: '01/01/2000',
        className: classes.input,
      },
    },
  ];
}

/** The columns with no input classes, for the plain pages. */
export const columns: Column<Row>[] = makeColumns();

// Name a row "error" to see a failed save.
export async function fakeSave(row: Row): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (row.name.toLowerCase() === 'error') {
    throw new Error('The server refused this name');
  }
}

/** The next id the fake server hands out. */
let nextId = 100;

// Like the server would: gives the row an id. "error" fails, like fakeSave.
export async function fakeAdd(row: Partial<Row>): Promise<Row> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (row.name?.toLowerCase() === 'error') {
    throw new Error('The server refused this name');
  }

  nextId += 1;

  return {
    id: nextId,
    name: row.name ?? '',
    country: row.country ?? '',
    cityId: row.cityId ?? null,
    cityName: row.cityName ?? null,
    age: row.age ?? 0,
    salary: row.salary ?? null,
    active: row.active ?? null,
    hired: row.hired ?? null,
  };
}

// Karim (id 4) can't be deleted, to see a failed delete.
export async function fakeDelete(row: Row): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (row.id === 4) {
    throw new Error('The server keeps this row');
  }
}

export const settings: DataTablesSettings = {
  order: [[1, 'asc']],
  lengthMenu: [5, 10, 20, -1],
};

export const french: DataTablesSettings['language'] = {
  search: 'Rechercher :',
  lengthMenu: '_MENU_ lignes par page',
  info: 'Lignes _START_ à _END_ sur _TOTAL_',
  infoEmpty: 'Aucune ligne',
  infoFiltered: '(filtré de _MAX_ lignes)',
  zeroRecords: 'Aucune ligne trouvée',
  emptyTable: 'Aucune donnée',
  paginate: { first: 'Premier', previous: 'Précédent', next: 'Suivant', last: 'Dernier' },
};
