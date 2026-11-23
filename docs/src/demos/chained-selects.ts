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

/** editing.md: a select whose options depend on another column. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name' },
    { title: 'Country', prop: 'country', editor: { type: 'select', options: countries } },
    {
      title: 'City',
      prop: 'cityId',
      className: 'dt-left',
      editor: {
        type: 'select',
        required: true,
        dependsOn: 'country',
        labelProp: 'cityName',
        options: async (row) => {
          await wait(500);
          return cities[row.country] ?? [];
        },
      },
    },
  ];

  new Tadabut<Employee>(box.table, {
    data: employees(),
    rowId: 'id',
    columns,
    dataTables: small,
    ...fakeServer(box),
    onSaved: (row) => box.status(`Saved: cityId ${row.cityId}, cityName '${row.cityName}'.`),
  });

  box.hint(
    'Edit a row and change the country: the cities load again, and the old city is cleared.',
  );
};

export default demo;
