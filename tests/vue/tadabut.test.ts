import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import { type Column, fr, type ServerResponse } from '../../src/index';
import { Tadabut, TadabutDefaults, type TadabutHandle } from '../../src/vue/index';
import { type } from '../helpers';

type Row = { id: number; name: string; city: string };

const rows: Row[] = [
  { id: 1, name: 'Amina', city: 'Rabat' },
  { id: 2, name: 'Youness', city: 'Casablanca' },
  { id: 3, name: 'Salma', city: 'Agadir' },
];

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
];

/** Every mounted wrapper, so each test cleans up after itself. */
const mounted: VueWrapper[] = [];

/** Mounts a parent built by `render`, attached to the page so focus and clicks work. */
function mountWith(render: () => ReturnType<typeof h>) {
  const wrapper = mount(defineComponent({ setup: () => render }), {
    attachTo: document.body.appendChild(document.createElement('div')),
  });
  mounted.push(wrapper);
  return wrapper;
}

/** The names shown, top to bottom. */
function namesShown(wrapper: VueWrapper): string[] {
  return wrapper.findAll('tbody tr td:nth-child(2)').map((td) => td.text());
}

afterEach(() => {
  for (const wrapper of mounted.splice(0)) {
    wrapper.unmount();
  }
});

describe('Vue Tadabut', () => {
  it('shows the rows', () => {
    const wrapper = mountWith(() => h(Tadabut<Row>, { data: rows, columns, rowId: 'id' }));

    expect(namesShown(wrapper)).toEqual(['Amina', 'Youness', 'Salma']);
  });

  it('follows push, splice and a new array, without rebuilding', async () => {
    const data = ref<Row[]>([...rows]);
    const wrapper = mountWith(() => h(Tadabut<Row>, { data: data.value, columns, rowId: 'id' }));
    const table = wrapper.find('table').element;

    data.value.push({ id: 4, name: 'Nadia', city: 'Fès' });
    await nextTick();
    expect(namesShown(wrapper)).toContain('Nadia');

    data.value.splice(0, 1);
    await nextTick();
    expect(namesShown(wrapper)).not.toContain('Amina');

    data.value = [rows[2] as Row];
    await nextTick();
    expect(namesShown(wrapper)).toEqual(['Salma']);

    expect(wrapper.find('table').element).toBe(table);
  });

  it("doesn't see a field changed inside a row: that's updateRow's job", async () => {
    const data = ref<Row[]>(rows.map((row) => ({ ...row })));
    const wrapper = mountWith(() => h(Tadabut<Row>, { data: data.value, columns, rowId: 'id' }));

    (data.value[0] as Row).name = 'Changed';
    await nextTick();

    expect(namesShown(wrapper)[0]).toBe('Amina');
  });

  it('turns a prop without a value into true, like <Tadabut selection current-row>', () => {
    const wrapper = mountWith(() =>
      h(Tadabut<Row>, { data: rows, columns, rowId: 'id', selection: '', currentRow: '' } as never),
    );

    expect(wrapper.find('.tdb-select-all').exists()).toBe(true);
    wrapper
      .find('tbody tr td:nth-child(3)')
      .element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(wrapper.find('tr.tdb-row-current').exists()).toBe(true);
  });

  it('emits the events, with the same arguments as the options', async () => {
    const saved = vi.fn();
    const select = vi.fn();
    const currentChange = vi.fn();
    const rowClick = vi.fn();
    const handle = ref<TadabutHandle<Row>>();

    const wrapper = mountWith(() =>
      h(Tadabut<Row>, {
        ref: handle,
        data: rows,
        columns,
        rowId: 'id',
        selection: true,
        currentRow: true,
        onSave: (row: Row) => row,
        onSaved: saved,
        onSelect: select,
        onCurrentChange: currentChange,
        onRowClick: rowClick,
      }),
    );

    handle.value?.select([2]);
    expect(select).toHaveBeenCalledWith([rows[1]]);

    wrapper
      .find('tbody tr td:nth-child(3)')
      .element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(currentChange).toHaveBeenCalledWith(rows[0]);
    expect(rowClick).toHaveBeenCalledWith(rows[0], expect.any(MouseEvent));

    handle.value?.edit(1);
    type(wrapper.find('.tdb-input').element as HTMLInputElement, 'Nadia');
    await handle.value?.save(1);

    expect(saved).toHaveBeenCalledWith({ ...rows[0], name: 'Nadia' }, { previous: rows[0] });
  });

  it('calls the latest onSave, without rebuilding', async () => {
    const first = vi.fn((row: Row) => row);
    const second = vi.fn((row: Row) => row);
    const onSave = ref(first);
    const handle = ref<TadabutHandle<Row>>();
    const wrapper = mountWith(() =>
      h(Tadabut<Row>, { ref: handle, data: rows, columns, rowId: 'id', onSave: onSave.value }),
    );
    const table = wrapper.find('table').element;

    onSave.value = second;
    await nextTick();
    handle.value?.edit(1);
    await handle.value?.save(1);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
    expect(wrapper.find('table').element).toBe(table);
  });

  it('keeps the table for inline editing, classNames and icons with the same values', async () => {
    const tick = ref(0);
    const wrapper = mountWith(() =>
      h(Tadabut<Row>, {
        data: rows,
        columns,
        rowId: 'id',
        editing: { mode: 'multiple' },
        classNames: { button: 'btn' },
        icons: { edit: 'fa fa-pencil' },
        // Read so the parent renders again when it changes.
        key: 'table',
        'data-tick': tick.value,
      } as never),
    );
    const table = wrapper.find('table').element;

    tick.value++;
    await nextTick();

    expect(wrapper.find('table').element).toBe(table);
  });

  it('puts class, id and other attributes on the wrapper, without a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = mountWith(() =>
      h(Tadabut<Row>, { data: rows, columns, rowId: 'id', class: 'card', id: 'employees' }),
    );

    const div = wrapper.find('#employees');

    expect(div.classes()).toContain('card');
    expect(div.find('table').exists()).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('rebuilds when the columns change', async () => {
    const tableColumns = ref<Column<Row>[]>(columns);
    const wrapper = mountWith(() =>
      h(Tadabut<Row>, { data: rows, columns: tableColumns.value, rowId: 'id' }),
    );

    tableColumns.value = [...columns, { title: 'City', prop: 'city' }];
    await nextTick();

    expect(wrapper.findAll('thead th').map((th) => th.text())).toContain('City');
  });

  it('turns editing off and on without rebuilding', async () => {
    const editable = ref(true);
    const wrapper = mountWith(() =>
      h(Tadabut<Row>, { data: rows, columns, rowId: 'id', editable: editable.value }),
    );
    const table = wrapper.find('table').element;

    editable.value = false;
    await nextTick();

    expect(wrapper.find('table').classes()).toContain('tdb-readonly');
    expect(wrapper.find('table').element).toBe(table);
  });

  it('draws the #detail slot under the row, and takes it away when it closes', async () => {
    const handle = ref<TadabutHandle<Row>>();
    const wrapper = mountWith(() =>
      h(
        Tadabut<Row>,
        { ref: handle, data: rows, columns, rowId: 'id' },
        { detail: ({ row }: { row: Row }) => [h('p', { class: 'lines' }, `Lines of ${row.name}`)] },
      ),
    );

    handle.value?.openDetail(2);
    await flushPromises();

    expect(wrapper.find('.lines').text()).toBe('Lines of Youness');
    expect(
      wrapper.find('.lines').element.closest('tr')?.previousElementSibling?.textContent,
    ).toContain('Youness');

    handle.value?.closeDetail(2);
    await flushPromises();

    expect(wrapper.find('.lines').exists()).toBe(false);
  });

  it('gives the core methods through the template ref', () => {
    const handle = ref<TadabutHandle<Row>>();
    mountWith(() => h(Tadabut<Row>, { ref: handle, data: rows, columns, rowId: 'id' }));

    expect(handle.value?.getRow(2)?.name).toBe('Youness');
    expect(handle.value?.getData()).toHaveLength(3);
    expect(handle.value?.getApi()).toBeDefined();
  });

  it('loads its rows from server, and reloads with the latest function', async () => {
    const first = vi.fn(async (): Promise<ServerResponse<Row>> => ({ rows, count: 3 }));
    const second = vi.fn(
      async (): Promise<ServerResponse<Row>> => ({ rows: [rows[2] as Row], count: 1 }),
    );
    const server = ref(first);
    const handle = ref<TadabutHandle<Row>>();
    const wrapper = mountWith(() =>
      h(Tadabut<Row>, { ref: handle, server: server.value, columns, rowId: 'id' }),
    );
    await flushPromises();

    expect(namesShown(wrapper)).toEqual(['Amina', 'Youness', 'Salma']);

    server.value = second;
    await nextTick();
    handle.value?.reload();
    await flushPromises();

    expect(namesShown(wrapper)).toEqual(['Salma']);
  });

  it('destroys the table on unmount', () => {
    const wrapper = mountWith(() => h(Tadabut<Row>, { data: rows, columns, rowId: 'id' }));

    wrapper.unmount();
    mounted.pop();

    expect(document.querySelector('.dt-container')).toBeNull();
  });
});

describe('Vue TadabutDefaults', () => {
  it('gives every table inside its options, and a table’s own props win', () => {
    const wrapper = mountWith(() =>
      h(
        TadabutDefaults,
        { value: { texts: fr, classNames: { button: 'btn' } } },
        {
          default: () => [
            h(Tadabut<Row>, {
              data: rows,
              columns,
              rowId: 'id',
              classNames: { edit: 'btn-primary' },
            }),
          ],
        },
      ),
    );

    const edit = wrapper.find('[data-tdb-action="edit"]');

    expect(edit.text()).toBe(fr.edit);
    expect(edit.classes()).toEqual(expect.arrayContaining(['btn', 'btn-primary']));
  });

  it('builds on an outer TadabutDefaults', () => {
    const wrapper = mountWith(() =>
      h(
        TadabutDefaults,
        { value: { texts: fr } },
        {
          default: () => [
            h(
              TadabutDefaults,
              { value: { texts: { edit: 'Changer' } } },
              {
                default: () => [
                  h(Tadabut<Row>, { data: rows, columns, rowId: 'id', onDelete: () => {} }),
                ],
              },
            ),
          ],
        },
      ),
    );

    expect(wrapper.find('[data-tdb-action="edit"]').text()).toBe('Changer');
    expect(wrapper.find('[data-tdb-action="delete"]').text()).toBe(fr.delete);
  });
});

describe('Vue Tadabut types', () => {
  it('knows the row type, in props and events', () => {
    // Never run: only type-checked.
    const check = () => {
      // @ts-expect-error "nope" isn't a field of Row.
      h(Tadabut<Row>, { data: rows, columns: [{ title: 'X', prop: 'nope' }], rowId: 'id' });
      // @ts-expect-error rowId must be a field of Row.
      h(Tadabut<Row>, { data: rows, columns, rowId: 'nope' });
      h(Tadabut<Row>, {
        data: rows,
        columns,
        onSaved: (row) => {
          // @ts-expect-error `row` is a Row, which has no "age".
          row.age;
        },
      });
    };

    expect(check).toBeTypeOf('function');
  });
});
