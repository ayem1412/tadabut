import { createApp, defineComponent, h, ref } from 'vue';

import type { Column } from '../../../src/index';
import { Tadabut } from '../../../src/vue/index';
import { type Demo, type Employee, employees, fakeServer, small } from './shared';

/** vue.md: the Vue component, with a slot, events and a pushed row. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Name', prop: 'name', editor: { type: 'text', required: true } },
    { title: 'Salary', prop: 'salary', editor: { type: 'money' }, total: 'sum' },
  ];

  /** Built with `h()`, so the docs site doesn't need Vue's compiler. */
  const App = defineComponent(() => {
    const rows = ref(employees());
    const server = fakeServer(box);

    box.button('Push a row', () => {
      const id = 100 + rows.value.length;
      rows.value.push({ ...(employees()[0] as Employee), id, name: `New ${id}`, salary: 5000 });
    });

    return () =>
      h(
        Tadabut<Employee>,
        {
          data: rows.value,
          columns,
          rowId: 'id',
          dataTables: small,
          onSave: server.onSave,
          onDelete: server.onDelete,
          onSaved: (row) => box.status(`@saved: ${row.name}.`),
          onDeleted: (row) => box.status(`@deleted: ${row.name}.`),
        },
        {
          detail: ({ row }: { row: Employee }) => [
            h('span', `${row.name} works in ${row.cityName ?? 'no city'}.`),
          ],
        },
      );
  });

  createApp(App).mount(box.table);
  box.status('A Vue app.');
  box.hint(
    'Push a row: the table sees rows.value.push(…) without a new array. Click ▸ for the #detail slot, or edit and save for @saved.',
  );
};

export default demo;
