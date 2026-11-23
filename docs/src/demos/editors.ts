import { type Column, Tadabut } from '../../../src/index';
import { countries, type Demo, type Employee, employees, fakeServer, small } from './shared';

/** editing.md: the main editor types. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name', editor: { type: 'text' } },
    { title: 'Age', prop: 'age', editor: { type: 'number', step: 1 } },
    { title: 'Hired', prop: 'hiredAt', editor: { type: 'date' } },
    {
      title: 'Active',
      prop: 'active',
      render: (value) => (value ? 'Yes' : 'No'),
      editor: { type: 'checkbox' },
    },
    { title: 'Country', prop: 'country', editor: { type: 'select', options: countries } },
  ];

  new Tadabut<Employee>(box.table, {
    data: employees(),
    rowId: 'id',
    columns,
    dataTables: small,
    ...fakeServer(box),
  });

  box.hint('Click Edit: each column gets the input of its type. Double-clicking a row works too.');
};

export default demo;
