import { type Column, Tadabut } from '../../../src/index';
import { countries, type Demo, type Employee, employees, fakeServer, small } from './shared';

/** editing.md: a new row that's always open. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name', editor: { type: 'text', required: true } },
    { title: 'Country', prop: 'country', editor: { type: 'select', options: countries } },
    { title: 'Salary', prop: 'salary', editor: { type: 'money' } },
  ];

  new Tadabut<Employee>(box.table, {
    data: employees().slice(0, 2),
    rowId: 'id',
    columns,
    dataTables: small,
    ...fakeServer(box),
    autoAdd: { country: 'MA' },
  });

  box.hint('Type a name in the open row and save it: the next empty row opens, ready for typing.');
};

export default demo;
