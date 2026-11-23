import { type Column, Tadabut } from '../../../src/index';
import { type Demo, type Employee, employees, fakeServer, small } from './shared';

/** editing.md: dates, times, and dates with a time. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name' },
    {
      title: 'Hired',
      prop: 'hiredAt',
      editor: { type: 'date', display: 'dd/mm/yyyy', min: '2000-01-01' },
    },
    { title: 'Starts', prop: 'starts', editor: { type: 'time', min: '07:00', max: '18:00' } },
    { title: 'Last login', prop: 'lastLogin', editor: { type: 'datetime', display: 'dd/mm/yyyy' } },
  ];

  new Tadabut<Employee>(box.table, {
    data: employees(),
    rowId: 'id',
    columns,
    dataTables: { ...small, order: [[1, 'asc']] },
    ...fakeServer(box),
    // Shows what the row really holds, which isn't what the cells show.
    onSaved: (row) => box.status(`Saved. The row holds hiredAt: '${row.hiredAt}'.`),
  });

  box.hint(
    'The cells show dd/mm/yyyy, but the rows keep yyyy-mm-dd. Click a header to sort: it uses the real date. Try a time before 07:00.',
  );
};

export default demo;
