import { describe, expect, it, vi } from 'vitest';

import { createEditor } from '../../src/editors/create';
import type { AnyEditor } from '../../src/editors/editor';
import { type Column, Tadabut, type TadabutOptions } from '../../src/index';
import { mountPoint, settle, type, waiting } from '../helpers';

describe('a read-only editor', () => {
  const configs: [string, AnyEditor, unknown][] = [
    ['text', { type: 'text', readOnly: true }, 'Amina'],
    ['number', { type: 'number', readOnly: true }, 42],
    ['money', { type: 'money', readOnly: true }, 12500],
    ['date', { type: 'date', readOnly: true }, '2024-01-05'],
    ['checkbox', { type: 'checkbox', readOnly: true }, true],
    ['select', { type: 'select', readOnly: true, options: [{ value: 1, label: 'Rabat' }] }, 1],
  ];

  it.each(configs)('locks the %s input and still shows the value', (_name, config, value) => {
    const editor = createEditor(config, { value, onChange: vi.fn() });

    expect((editor.element as HTMLInputElement).disabled).toBe(true);
    expect(editor.getValue()).toBe(value);
  });

  it.each(configs)("doesn't lock the %s input without readOnly", (_name, config, value) => {
    const editor = createEditor({ ...config, readOnly: false } as AnyEditor, {
      value,
      onChange: vi.fn(),
    });

    expect((editor.element as HTMLInputElement).disabled).toBe(false);
  });

  it('gives a custom editor readOnly in its context', () => {
    const create = vi.fn(() => ({
      element: document.createElement('span'),
      getValue: () => null,
      setValue: () => {},
      focus: () => {},
      destroy: () => {},
    }));

    createEditor({ type: 'custom', readOnly: true, create }, { value: null, onChange: vi.fn() });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ readOnly: true }));
  });
});

describe('a read-only select', () => {
  it('stays locked once its options load, with its value picked', async () => {
    const load = waiting<{ value: number; label: string }[]>();
    const editor = createEditor(
      { type: 'select', readOnly: true, options: load.fn },
      { value: 2, onChange: vi.fn() },
    );
    const select = editor.element as HTMLSelectElement;

    const loading = editor.load?.({});
    load.resolve([
      { value: 1, label: 'Rabat' },
      { value: 2, label: 'Fès' },
    ]);
    await loading;

    expect(select.disabled).toBe(true);
    expect(select.selectedIndex).toBe(1);
  });

  it('picks a value set from code while locked', () => {
    const editor = createEditor(
      {
        type: 'select',
        readOnly: true,
        options: [
          { value: 1, label: 'Rabat' },
          { value: 2, label: 'Fès' },
        ],
      },
      { value: 1, onChange: vi.fn() },
    );

    editor.setValue(2);

    expect((editor.element as HTMLSelectElement).selectedIndex).toBe(1);
  });
});

type Row = { id: number; code: string; name: string; hired: string | null };

function setup(columns: Column<Row>[], options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const onSave = vi.fn();
  const table = new Tadabut(container, {
    data: [{ id: 1, code: 'EMP-0001', name: 'Amina', hired: '2024-01-05T10:30:00' }],
    rowId: 'id',
    columns,
    onSave,
    ...options,
  });

  return { container, table, onSave };
}

describe('a read-only field in a row', () => {
  it('keeps the value it had when the row is saved', async () => {
    const { table, container, onSave } = setup([
      { title: 'Code', prop: 'code', editor: { type: 'text', readOnly: true } },
      { title: 'Name', prop: 'name', editor: { type: 'text' } },
    ]);

    table.edit(1);
    type(
      container.querySelectorAll<HTMLInputElement>('tbody .tdb-input')[1] as HTMLInputElement,
      'Nadia',
    );
    await table.save(1);

    expect(onSave).toHaveBeenCalledWith(
      { id: 1, code: 'EMP-0001', name: 'Nadia', hired: '2024-01-05T10:30:00' },
      expect.anything(),
    );
  });

  it("keeps a value its input can't show, like a date with a time", async () => {
    const { table, onSave } = setup([
      { title: 'Hired', prop: 'hired', editor: { type: 'date', readOnly: true } },
    ]);

    table.edit(1);
    await table.save(1);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ hired: '2024-01-05T10:30:00' }),
      expect.anything(),
    );
  });

  it('is never checked, so a locked empty required field still saves', async () => {
    const { table, onSave } = setup(
      [{ title: 'Code', prop: 'code', editor: { type: 'text', required: true, readOnly: true } }],
      { data: [{ id: 1, code: '', name: 'Amina', hired: null }] },
    );

    table.edit(1);

    expect(await table.save(1)).toBe(true);
    expect(onSave).toHaveBeenCalled();
  });

  it('runs no custom validate on it', async () => {
    const validate = vi.fn(() => 'Never');
    const { table } = setup([
      { title: 'Code', prop: 'code', editor: { type: 'text', readOnly: true, validate } },
    ]);

    table.edit(1);

    expect(await table.save(1)).toBe(true);
    expect(validate).not.toHaveBeenCalled();
  });
});

describe('a read-only field in the new row', () => {
  it('is locked, with the value given to add()', async () => {
    const { table, container } = setup([
      { title: 'Code', prop: 'code', editor: { type: 'text', readOnly: true } },
      { title: 'Name', prop: 'name', editor: { type: 'text' } },
    ]);

    table.add({ code: 'NEW' });
    const [code] = container.querySelectorAll<HTMLInputElement>('.tdb-row-new .tdb-input');

    expect(code?.disabled).toBe(true);
    expect(code?.value).toBe('NEW');
  });

  it('puts the cursor in the first field that is not read-only', () => {
    const { table, container } = setup([
      { title: 'Code', prop: 'code', editor: { type: 'text', readOnly: true } },
      { title: 'Name', prop: 'name', editor: { type: 'text' } },
    ]);

    table.add();

    expect(document.activeElement).toBe(container.querySelectorAll('.tdb-row-new .tdb-input')[1]);
  });

  it('is sent to onAdd as given', async () => {
    const onAdd = vi.fn((row: Partial<Row>) => ({ ...row, id: 2 }) as Row);
    const { table, container } = setup(
      [
        { title: 'Code', prop: 'code', editor: { type: 'text', readOnly: true } },
        { title: 'Name', prop: 'name', editor: { type: 'text' } },
      ],
      { onAdd },
    );

    table.add({ code: 'NEW' });
    type(
      container.querySelectorAll<HTMLInputElement>(
        '.tdb-row-new .tdb-input',
      )[1] as HTMLInputElement,
      'Karim',
    );
    await table.saveNew();
    await settle();

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ code: 'NEW', name: 'Karim' }));
  });
});
