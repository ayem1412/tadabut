import type { Column } from '../src/index';

export type Row = {
  id: number;
  name: string;
  city: string;
  age: number;
};

export const rows: Row[] = [
  { id: 1, name: 'Amina Benali', city: 'Rabat', age: 29 },
  { id: 2, name: 'Youness Idrissi', city: 'Casablanca', age: 34 },
  { id: 3, name: 'Salma Ait Ouahmane', city: 'Agadir', age: 25 },
  { id: 4, name: 'Karim El Fassi', city: 'Fès', age: 41 },
  { id: 5, name: 'Nadia Amrani', city: 'Tanger', age: 37 },
  { id: 6, name: 'Hamza Ouchen', city: 'Marrakech', age: 22 },
  { id: 7, name: 'Leila Berrada', city: 'Meknès', age: 31 },
  { id: 8, name: 'Omar Tazi', city: 'Oujda', age: 45 },
  { id: 9, name: 'Ilham Zerouali', city: 'Tétouan', age: 28 },
  { id: 10, name: 'Mehdi Alaoui', city: 'Kénitra', age: 33 },
  { id: 11, name: 'Sara Lahlou', city: 'Rabat', age: 26 },
  { id: 12, name: 'Anass Bennani', city: 'Casablanca', age: 39 },
];

const cities = [
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
];

export const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  {
    title: 'Name',
    prop: 'name',
    editor: { type: 'text', required: true, maxLength: 50 },
  },
  {
    title: 'City',
    prop: 'city',
    editor: {
      type: 'select',
      options: cities.map((city) => ({ value: city, label: city })),
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
