import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type CheckboxEditor,
  type CheckboxValues,
  createCheckboxEditor,
} from '../../src/editors/checkbox';
import { type Column, Tadabut } from '../../src/index';

/** With `'O'` and `'N'` instead of `true` and `false`. */
function setupValues(
  value: unknown,
  values: CheckboxValues<unknown> = { checked: 'O', unchecked: 'N' },
) {
  const onChange = vi.fn();
  const editor = createCheckboxEditor({ type: 'checkbox', values }, { value, onChange });
  const input = editor.element as HTMLInputElement;
  document.body.appendChild(input);

  return { editor, input, onChange };
}

function setup(config: Omit<CheckboxEditor, 'type'> = {}, value: boolean | null = true) {
  const { className, ...options } = config;
  const onChange = vi.fn();
  const editor = createCheckboxEditor(
    { type: 'checkbox', ...options },
    { value, onChange, className },
  );
  const input = editor.element as HTMLInputElement;
  document.body.appendChild(input);

  return { editor, input, onChange };
}

describe('checkbox editor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is a checkbox', () => {
    const { input } = setup();

    expect(input.type).toBe('checkbox');
  });

  it('is checked when the value is true', () => {
    const { editor, input } = setup({}, true);

    expect(input.checked).toBe(true);
    expect(editor.getValue()).toBe(true);
  });

  it('is unchecked when the value is false', () => {
    const { editor, input } = setup({}, false);

    expect(input.checked).toBe(false);
    expect(editor.getValue()).toBe(false);
  });

  it('shows null as unchecked, and keeps it until clicked', () => {
    const { editor, input } = setup({}, null);

    expect(input.checked).toBe(false);
    expect(editor.getValue()).toBeNull();

    input.click();
    input.click();
    expect(editor.getValue()).toBe(false);
  });

  it('has the Tadabut classes and className', () => {
    const { input } = setup({ className: 'accent-blue-600' });

    expect([...input.classList]).toEqual(['tdb-input', 'tdb-input-checkbox', 'accent-blue-600']);
  });

  it('reports each click', () => {
    const { editor, input, onChange } = setup({}, true);

    input.click();
    expect(editor.getValue()).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);

    input.click();
    expect(editor.getValue()).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(true);

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('shows a value set from code without calling onChange', () => {
    const { editor, input, onChange } = setup({}, true);

    editor.setValue(false);
    expect(input.checked).toBe(false);

    editor.setValue(true);
    expect(input.checked).toBe(true);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes itself on destroy', () => {
    const { editor, input } = setup();

    editor.destroy();

    expect(document.body.contains(input)).toBe(false);
  });
});

describe('checkbox editor with values', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('ticks the box for the checked value only', () => {
    expect(setupValues('O').input.checked).toBe(true);
    expect(setupValues('N').input.checked).toBe(false);
    expect(setupValues('o').input.checked).toBe(false);
  });

  it('writes checked and unchecked when clicked', () => {
    const { editor, input, onChange } = setupValues('N');

    input.click();
    expect(editor.getValue()).toBe('O');
    expect(onChange).toHaveBeenLastCalledWith('O');

    input.click();
    expect(editor.getValue()).toBe('N');
    expect(onChange).toHaveBeenLastCalledWith('N');
  });

  it('keeps a value that is neither until the box is clicked', () => {
    const { editor, input } = setupValues('X');

    expect(input.checked).toBe(false);
    expect(editor.getValue()).toBe('X');

    input.click();
    expect(editor.getValue()).toBe('O');
  });

  it('compares numbers exactly, so 1 is not "1"', () => {
    const values = { checked: 1, unchecked: 0 };

    expect(setupValues(1, values).input.checked).toBe(true);
    expect(setupValues('1', values).input.checked).toBe(false);
  });

  it('keeps a value set from code', () => {
    const { editor, input } = setupValues('N');

    editor.setValue('O');
    expect(input.checked).toBe(true);
    expect(editor.getValue()).toBe('O');

    editor.setValue(null);
    expect(input.checked).toBe(false);
    expect(editor.getValue()).toBeNull();
  });
});

describe('checkbox with values in a table', () => {
  type Row = { id: number; active: 'O' | 'N' | null };

  const columns: Column<Row>[] = [
    { title: 'ID', prop: 'id' },
    {
      title: 'Active',
      prop: 'active',
      editor: { type: 'checkbox', values: { checked: 'O', unchecked: 'N' } },
    },
  ];

  function table(rows: Row[], onSave = vi.fn()) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const created = new Tadabut<Row>(container, { data: rows, rowId: 'id', columns, onSave });
    const box = () => container.querySelector<HTMLInputElement>('tbody input') as HTMLInputElement;

    return { table: created, box, onSave };
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('saves an untouched null as null', async () => {
    const { table: t, onSave } = table([{ id: 1, active: null }]);

    t.edit(1);
    await t.save(1);

    expect(onSave).toHaveBeenCalledWith({ id: 1, active: null }, expect.anything());
  });

  it('saves the column value, not true or false', async () => {
    const { table: t, box, onSave } = table([{ id: 1, active: 'O' }]);

    t.edit(1);
    expect(box().checked).toBe(true);
    box().click();
    await t.save(1);

    expect(onSave).toHaveBeenCalledWith({ id: 1, active: 'N' }, expect.anything());
  });

  it('adds a new row with null until the box is clicked', async () => {
    const onSave = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onAdd = vi.fn((row: Partial<Row>) => ({ ...row, id: 2 }) as Row);
    const t = new Tadabut<Row>(container, { data: [], rowId: 'id', columns, onSave, onAdd });

    t.add();
    await t.saveNew();

    expect(onAdd).toHaveBeenCalledWith({ active: null });
  });
});
