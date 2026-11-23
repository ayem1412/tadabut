import { type Column, Tadabut } from '../../../src/index';
import { type Demo, type Employee, employees, small } from './shared';

/** rows.md: one highlighted row. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name' },
    { title: 'Age', prop: 'age' },
  ];

  new Tadabut<Employee>(box.table, {
    data: employees(),
    rowId: 'id',
    columns,
    dataTables: small,
    currentRow: true,
    onCurrentChange: (row) =>
      box.status(row === null ? 'Nothing highlighted.' : `Highlighted: ${row.name}.`),
  });

  box.status('Nothing highlighted.');
  box.hint('Click a row to highlight it. Click it again, and the highlight goes away.');
};

export default demo;
