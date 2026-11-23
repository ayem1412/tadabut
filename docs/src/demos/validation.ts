import { type Column, Tadabut } from '../../../src/index';
import { type Demo, type Employee, employees, fakeServer, small } from './shared';

/** editing.md: `required`, the built-in rules, and `validate`. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name', editor: { type: 'text', required: true, minLength: 2 } },
    {
      title: 'Age',
      prop: 'age',
      editor: {
        type: 'number',
        required: true,
        min: 18,
        validate: (value, row) =>
          row.active && value !== null && value > 65
            ? 'Active employees must be 65 or younger'
            : undefined,
      },
    },
    {
      title: 'Active',
      prop: 'active',
      render: (value) => (value ? 'Yes' : 'No'),
      editor: { type: 'checkbox' },
    },
  ];

  new Tadabut<Employee>(box.table, {
    data: employees(),
    rowId: 'id',
    columns,
    dataTables: small,
    ...fakeServer(box),
  });

  box.hint(
    'Edit a row, clear the name or set the age to 70, then save. Untick Active, and 70 is fine.',
  );
};

export default demo;
