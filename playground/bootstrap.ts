import 'bootstrap/dist/css/bootstrap.min.css';
import 'datatables.net-bs5';
import 'datatables.net-bs5/css';

import { type Column, type TableClassNames, Tadabut } from '../src/index';
import { countries, fakeAdd, fakeDelete, fakeSave, fetchCities, type Row, rows } from './data';

const container = document.querySelector<HTMLElement>('#container');
const addBtn = document.querySelector<HTMLButtonElement>('#add');

if (!container || !addBtn) {
  throw new Error('Playground: missing elements in bootstrap.html');
}

const classNames: TableClassNames = {
  table: 'table table-striped table-hover align-middle',
  button: 'btn btn-sm',
  edit: 'btn-outline-primary',
  save: 'btn-primary',
  cancel: 'btn-outline-secondary',
  delete: 'btn-outline-danger',
  confirm: 'btn-danger',
  keep: 'btn-outline-secondary',
};

// Same columns as data.ts, plus Bootstrap classes on the inputs.
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

const table = new Tadabut(container, {
  data: rows,
  columns,
  rowId: 'id',
  onSave: fakeSave,
  onAdd: fakeAdd,
  onDelete: fakeDelete,
  classNames,
});

addBtn.addEventListener('click', () => {
  table.add({ country: 'MA' });
});
