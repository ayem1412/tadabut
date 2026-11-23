import { type Column, html, Tadabut } from '../../../src/index';
import { type Demo, type Employee, employees, small } from './shared';

/** columns.md: `render` returning an element built with `html`. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name' },
    {
      title: 'Status',
      prop: 'status',
      render: (value) =>
        html`<span class="demo-badge demo-badge-${value === 'Working' ? 'on' : 'off'}">${value}</span>`,
    },
  ];

  new Tadabut<Employee>(box.table, { data: employees(), rowId: 'id', columns, dataTables: small });

  box.hint(
    'The last status is the text "<b>Remote</b>" in the data. It shows as text, not bold: html escaped it.',
  );
};

export default demo;
