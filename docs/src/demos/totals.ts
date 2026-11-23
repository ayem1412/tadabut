import { type Column, Tadabut } from '../../../src/index';
import { type Demo, type Employee, employees, fakeServer, small } from './shared';

/** columns.md: a footer line with totals. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name' },
    {
      title: 'Age',
      prop: 'age',
      render: (value) => `${value} years`,
      editor: { type: 'number', step: 1 },
      total: 'avg',
    },
    { title: 'Salary', prop: 'salary', editor: { type: 'money' }, total: 'sum' },
  ];

  new Tadabut<Employee>(box.table, {
    data: employees(),
    rowId: 'id',
    columns,
    dataTables: small,
    ...fakeServer(box),
  });

  box.hint('Change an age or a salary and save: the footer follows.');
};

export default demo;
