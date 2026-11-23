import { type Column, Tadabut } from '../../../src/index';
import { type Demo, type Employee, employees, small, wait } from './shared';

/** A few projects for each employee, as if they came from a server. */
const projects: Record<number, string[]> = {
  1: ['Online quotes', 'Agency dashboard'],
  2: ['Claims export'],
  3: ['Mobile app', 'Payments', 'Customer portal'],
  4: [],
};

/** rows.md: a line under the row, loaded when it opens. */
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
    detail: async (row) => {
      await wait(600);

      const names = projects[row.id] ?? [];

      if (names.length === 0) {
        throw new Error(`Couldn't find the projects of ${row.name}.`);
      }

      const list = document.createElement('ul');

      for (const name of names) {
        const item = document.createElement('li');
        item.textContent = name;
        list.append(item);
      }

      return list;
    },
  });

  box.hint("Click ▸ to load a row's projects. The last row fails, to show the error.");
};

export default demo;
