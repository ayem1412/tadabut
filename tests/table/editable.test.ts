import { describe, expect, it, vi } from 'vitest';

import { type Column, Tadabut, type TadabutOptions } from '../../src/index';
import { goToPage, mountPoint, settle, type, waiting } from '../helpers';

type Row = { id: number; name: string; salary: number };

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
  { title: 'Salary', prop: 'salary', total: 'sum' },
];

/** 12 rows: ids 1 to 12, so there are 2 pages. */
function rows(): Row[] {
  return Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}`, salary: 100 }));
}

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const table = new Tadabut(container, {
    data: rows(),
    rowId: 'id',
    columns,
    onSave: (row) => row,
    onAdd: (row) => ({ ...row, id: 99, salary: 0 }) as Row,
    onDelete: () => {},
    dataTables: { order: [] },
    ...options,
  });

  const tableEl = () => container.querySelector('table') as HTMLTableElement;
  /** Whether the buttons column shows: DataTables takes its header out when hidden. */
  const buttonsShown = () =>
    container.querySelector('thead th:last-child')?.textContent !== 'Salary';
  /** The first row's button for this action, if it shows. */
  const button = (action: string) =>
    container.querySelector<HTMLButtonElement>(`tbody tr [data-tdb-action="${action}"]`);
  const nameInput = () => container.querySelector<HTMLInputElement>('.tdb-input-text');

  return { container, table, tableEl, buttonsShown, button, nameInput };
}

describe('starting read-only', () => {
  it('is editable by default', () => {
    const { table, tableEl, buttonsShown } = setup();

    expect(table.isEditable()).toBe(true);
    expect(tableEl().classList.contains('tdb-readonly')).toBe(false);
    expect(buttonsShown()).toBe(true);
  });

  it('hides the buttons and adds tdb-readonly with editable: false', () => {
    const { table, tableEl, buttonsShown, button } = setup({ editable: false });

    expect(table.isEditable()).toBe(false);
    expect(tableEl().classList.contains('tdb-readonly')).toBe(true);
    expect(buttonsShown()).toBe(false);
    expect(button('edit')).toBeNull();
  });

  it('keeps the footer lined up with the columns', () => {
    const { container } = setup({ editable: false });

    expect(container.querySelectorAll('tfoot td, tfoot th')).toHaveLength(3);
  });
});

describe('what off blocks', () => {
  it('refuses edit, add and delete, without calling onEditStart or onDelete', async () => {
    const onEditStart = vi.fn();
    const onDelete = vi.fn();
    const { table } = setup({ editable: false, onEditStart, onDelete });

    expect(table.edit(1)).toBe(false);
    expect(table.add()).toBe(false);
    expect(await table.delete(1)).toBe(false);

    expect(onEditStart).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(table.getRow(1)).toBeDefined();
  });

  it('blocks the double click too', () => {
    const { container, table } = setup({ editable: false, editing: { doubleClick: true } });

    container
      .querySelector('tbody tr td:nth-child(2)')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(table.isEditing(1)).toBe(false);
  });

  it('leaves the rest working: checkboxes, the current row and changes from code', () => {
    const { table } = setup({ editable: false, selection: true, currentRow: true });

    table.select([1]);
    table.setCurrent(2);

    expect(table.updateRow({ id: 3, name: 'Changed', salary: 100 })).toBe(true);
    expect(table.removeRow(4)).toBe(true);
    expect(table.getSelected()).toHaveLength(1);
    expect(table.isCurrent(2)).toBe(true);
  });
});

describe('setEditable', () => {
  it('turns it off and back on, buttons included', () => {
    const { table, tableEl, buttonsShown } = setup();

    table.setEditable(false);

    expect(buttonsShown()).toBe(false);
    expect(tableEl().classList.contains('tdb-readonly')).toBe(true);

    table.setEditable(true);

    expect(buttonsShown()).toBe(true);
    expect(tableEl().classList.contains('tdb-readonly')).toBe(false);
    expect(table.edit(1)).toBe(true);
  });

  it('cancels every open row and the new row, losing their changes', () => {
    const { table, nameInput } = setup({ editing: { mode: 'multiple' } });
    table.edit(1);
    table.edit(2);
    table.add();
    type(nameInput() as HTMLInputElement, 'Typed');

    table.setEditable(false);

    expect(table.isEditing(1)).toBe(false);
    expect(table.isEditing(2)).toBe(false);
    expect(table.isAdding()).toBe(false);
    expect(table.getRow(1)?.name).toBe('Row 1');
  });

  it('cancels the new row even when no other row is open', () => {
    const { table } = setup();
    table.add();

    table.setEditable(false);

    expect(table.isAdding()).toBe(false);
  });

  it('lets a row that is saving finish its save', async () => {
    const onSave = waiting<Row>();
    const onSaved = vi.fn();
    const { table, nameInput } = setup({ onSave: onSave.fn, onSaved });
    table.edit(1);
    type(nameInput() as HTMLInputElement, 'Saved');
    const saving = table.save(1);

    table.setEditable(false);
    onSave.resolve({ id: 1, name: 'Saved', salary: 100 });

    expect(await saving).toBe(true);
    expect(table.getRow(1)?.name).toBe('Saved');
    expect(onSaved).toHaveBeenCalled();
  });

  it('cancels a row whose save fails after it was turned off, and shows why', async () => {
    const onSave = waiting<Row>();
    const { container, table, nameInput } = setup({ onSave: onSave.fn });
    table.edit(1);
    type(nameInput() as HTMLInputElement, 'Lost');
    const saving = table.save(1);

    table.setEditable(false);
    onSave.reject(new Error('Server down'));

    expect(await saving).toBe(false);
    expect(table.isEditing(1)).toBe(false);
    expect(table.getRow(1)?.name).toBe('Row 1');
    expect(container.querySelector('.tdb-row-error-message')?.textContent).toBe('Server down');
  });

  it('lets the new row finish its add, and drops it if the add fails', async () => {
    const onAdd = waiting<Row>();
    const { table, nameInput } = setup({ onAdd: onAdd.fn });
    table.add();
    type(nameInput() as HTMLInputElement, 'New');
    const adding = table.saveNew();

    table.setEditable(false);
    onAdd.reject(new Error('Server down'));

    expect(await adding).toBe(false);
    expect(table.isAdding()).toBe(false);
  });

  it('takes back "Delete this row?", on every page, so it is not there when editing comes back', () => {
    const { container, table, button } = setup();
    button('delete')?.click();
    goToPage(container, 1);
    container.querySelector<HTMLButtonElement>('tbody tr [data-tdb-action="delete"]')?.click();

    table.setEditable(false);
    table.setEditable(true);

    expect(container.querySelector('.tdb-delete-question')).toBeNull();
    goToPage(container, 0);
    expect(container.querySelector('.tdb-delete-question')).toBeNull();
    expect(button('edit')).not.toBeNull();
  });

  it('lets a delete that is running finish', async () => {
    const onDelete = waiting<void>();
    const { table } = setup({ onDelete: onDelete.fn });
    const deleting = table.delete(1);

    table.setEditable(false);
    onDelete.resolve();

    expect(await deleting).toBe(true);
    expect(table.getRow(1)).toBeUndefined();
  });

  it('does nothing when it is already in that state', () => {
    const { table } = setup();
    table.edit(1);

    table.setEditable(true);

    expect(table.isEditing(1)).toBe(true);
  });

  it('opens the new row with its buttons once back on', async () => {
    const { container, table } = setup({ editable: false });

    table.setEditable(true);
    table.add();
    await settle();

    expect(container.querySelector('.tdb-row-new [data-tdb-action="save"]')).not.toBeNull();
  });
});
