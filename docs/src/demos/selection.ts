import { type Column, defaultMoneyFormat, formatMoney, Tadabut } from '../../../src/index';
import { type Demo, type Employee, employees, small } from './shared';

/** rows.md: the checkbox column. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name' },
    {
      title: 'Salary',
      prop: 'salary',
      render: (value) => formatMoney(value, defaultMoneyFormat),
      total: 'sum',
    },
  ];

  new Tadabut<Employee>(box.table, {
    data: employees(),
    rowId: 'id',
    columns,
    dataTables: small,
    selection: true,
    totalRows: 'selected',
    onSelect: (rows) =>
      box.status(
        rows.length === 0
          ? 'Nothing selected.'
          : `${rows.length} selected: ${rows.map((row) => row.name).join(', ')}.`,
      ),
  });

  box.status('Nothing selected.');
  box.hint(
    "Tick some rows, or the box in the header. The total only counts the ticked rows, with totalRows: 'selected'.",
  );
};

export default demo;
