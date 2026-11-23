import { type Column, Tadabut } from '../../../src/index';
import { type Demo, type Employee, employees, fakeServer, small } from './shared';

/** editing.md: turning editing off and on. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name', editor: { type: 'text', required: true } },
    { title: 'Salary', prop: 'salary', editor: { type: 'money' } },
  ];

  const table = new Tadabut<Employee>(box.table, {
    data: employees(),
    rowId: 'id',
    columns,
    dataTables: small,
    ...fakeServer(box),
  });

  const toggle = box.button('Turn editing off', () => {
    table.setEditable(!table.isEditable());
    toggle.textContent = table.isEditable() ? 'Turn editing off' : 'Turn editing on';
    box.status(table.isEditable() ? 'Editing is on.' : 'Editing is off.');
  });

  box.status('Editing is on.');
  box.hint('Open a row, then turn editing off: the row closes, and the buttons go away.');
};

export default demo;
