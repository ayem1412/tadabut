import { type Column, Tadabut } from '../../../src/index';
import {
  cities,
  countries,
  type Demo,
  type Employee,
  employees,
  fakeServer,
  small,
  wait,
} from './shared';

/** The home page: a bit of everything. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name', editor: { type: 'text', required: true } },
    { title: 'Country', prop: 'country', editor: { type: 'select', options: countries } },
    {
      title: 'City',
      prop: 'cityId',
      // The ids are numbers, so DataTables would push the names to the right.
      className: 'dt-left',
      editor: {
        type: 'select',
        required: true,
        dependsOn: 'country',
        labelProp: 'cityName',
        // A short wait, so you can see the cities load after the country changes.
        options: async (row) => {
          await wait(300);
          return cities[row.country] ?? [];
        },
      },
    },
    { title: 'Salary', prop: 'salary', editor: { type: 'money' }, total: 'sum' },
    {
      title: 'Active',
      prop: 'active',
      render: (value) => (value ? 'Yes' : 'No'),
      editor: { type: 'checkbox' },
    },
  ];

  const table = new Tadabut<Employee>(box.table, {
    data: employees(),
    rowId: 'id',
    columns,
    dataTables: small,
    ...fakeServer(box),
  });

  box.button('Add a row', () => table.add({ country: 'MA', active: true }));
  box.status('Click Edit on a row, or add one.');
  box.hint(
    'Change a country and watch the cities reload. Save a name of "error" to see a failed save.',
  );
};

export default demo;
