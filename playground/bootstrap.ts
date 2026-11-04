import 'bootstrap/dist/css/bootstrap.min.css';
import 'datatables.net-bs5';
import 'datatables.net-bs5/css';

import { type Column, type TableClassNames, Tadabut } from '../src/index';
import { countries, fakeSave, fetchCities, type Row, rows } from './data';

const container = document.querySelector<HTMLElement>('#container');

if (!container) {
  throw new Error('Playground: missing #container in bootstrap.html');
}

/** Bootstrap's classes for the table and the Edit, Save and Cancel buttons. */
const classNames: TableClassNames = {
  table: 'table table-striped table-hover align-middle',
  button: 'btn btn-sm',
  edit: 'btn-outline-primary',
  save: 'btn-primary',
  cancel: 'btn-outline-secondary',
};

/** The same columns as data.ts, with Bootstrap's classes on each editor. */
const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  {
    title: 'Name',
    prop: 'name',
    editor: {
      type: 'text',
      required: true,
      maxLength: 50,
      className: 'form-control form-control-sm',
    },
  },
  {
    title: 'Country',
    prop: 'country',
    editor: { type: 'select', options: countries, className: 'form-select form-select-sm' },
  },
  {
    title: 'City',
    prop: 'cityId',
    editor: {
      type: 'select',
      required: true,
      dependsOn: 'country',
      className: 'form-select form-select-sm',
      // The server sends ids and names. The id goes in `cityId`, and the
      // name in `cityName`: the cell shows it, and onSave gets both.
      labelProp: 'cityName',
      options: async (row, { signal }) => {
        const cities = await fetchCities(row.country, signal);
        return cities.map((city) => ({ value: city.id, label: city.name }));
      },
    },
  },
  {
    title: 'Age',
    prop: 'age',
    editor: { type: 'number', min: 18, max: 99, className: 'form-control form-control-sm' },
    render: (value) => `${value} years`,
  },
];

new Tadabut(container, { data: rows, columns, rowId: 'id', onSave: fakeSave, classNames });
