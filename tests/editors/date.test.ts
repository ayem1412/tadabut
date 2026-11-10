import { describe, expect, it, vi } from 'vitest';

import { createDateEditor, type DateEditor } from '../../src/editors/date';
import { type } from '../helpers';

function setup(config: Omit<DateEditor, 'type'> = {}, value: string | null = '2024-01-05') {
  const { className, ...options } = config;
  const onChange = vi.fn();
  const editor = createDateEditor({ type: 'date', ...options }, { value, onChange, className });
  const input = editor.element as HTMLInputElement;
  document.body.appendChild(input);

  return { editor, input, onChange };
}

/** Picking a date in the calendar sets the text like typing does. */
function pick(input: HTMLInputElement, date: string): void {
  type(input, date);
}

describe('date editor', () => {
  it('is a date input', () => {
    const { input } = setup();

    expect(input.type).toBe('date');
  });

  it('shows the starting value as it is', () => {
    const { editor, input } = setup({}, '2024-01-05');

    expect(input.value).toBe('2024-01-05');
    expect(editor.getValue()).toBe('2024-01-05');
  });

  it('shows null as empty', () => {
    const { editor, input } = setup({}, null);

    expect(input.value).toBe('');
    expect(editor.getValue()).toBeNull();
  });

  it('drops a time after the date', () => {
    const { editor, input } = setup({}, '2024-01-05T10:30:00');

    expect(input.value).toBe('2024-01-05');
    expect(editor.getValue()).toBe('2024-01-05');
  });

  it('shows other date formats as empty', () => {
    const { editor, input } = setup({}, '05/01/2024');

    expect(input.value).toBe('');
    expect(editor.getValue()).toBeNull();
  });

  it('has the Tadabut classes and className', () => {
    const { input } = setup({ className: 'border' });

    expect([...input.classList]).toEqual(['tdb-input', 'tdb-input-date', 'border']);
  });

  it('sets min and max when given', () => {
    const { input } = setup({ min: '2020-01-01', max: '2030-12-31' });

    expect(input.min).toBe('2020-01-01');
    expect(input.max).toBe('2030-12-31');
  });

  it('leaves out min and max when not given', () => {
    const { input } = setup();

    expect(input.hasAttribute('min')).toBe(false);
    expect(input.hasAttribute('max')).toBe(false);
  });

  it('reports the picked date as text', () => {
    const { editor, input, onChange } = setup();

    pick(input, '2025-03-09');

    expect(editor.getValue()).toBe('2025-03-09');
    expect(onChange).toHaveBeenCalledWith('2025-03-09');
  });

  it('reports null when cleared', () => {
    const { editor, input, onChange } = setup();

    pick(input, '');

    expect(editor.getValue()).toBeNull();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows a value set from code without calling onChange', () => {
    const { editor, input, onChange } = setup();

    editor.setValue('2026-10-24');
    expect(input.value).toBe('2026-10-24');

    editor.setValue(null);
    expect(input.value).toBe('');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes itself on destroy', () => {
    const { editor, input } = setup();

    editor.destroy();

    expect(document.body.contains(input)).toBe(false);
  });

  describe('with a format', () => {
    it('shows a dd/mm/yyyy value in the picker, and gives it back the same way', () => {
      const { editor, input, onChange } = setup({ format: 'dd/mm/yyyy' }, '05/01/2024');

      expect(input.value).toBe('2024-01-05');
      expect(editor.getValue()).toBe('05/01/2024');

      pick(input, '2024-02-29');

      expect(editor.getValue()).toBe('29/02/2024');
      expect(onChange).toHaveBeenLastCalledWith('29/02/2024');
    });

    it('shows a value in another format, or not a real date, as empty', () => {
      expect(setup({ format: 'dd/mm/yyyy' }, '2024-01-05').input.value).toBe('');
      expect(setup({ format: 'dd/mm/yyyy' }, '31/02/2024').input.value).toBe('');
    });

    it('reads min and max in the format', () => {
      const { input } = setup({ format: 'dd/mm/yyyy', min: '01/01/2020', max: '31/12/2030' });

      expect(input.min).toBe('2020-01-01');
      expect(input.max).toBe('2030-12-31');
    });

    it('sets the value from code in the format', () => {
      const { editor, input } = setup({ format: 'dd.mm.yyyy' }, null);

      editor.setValue('05.01.2024');

      expect(input.value).toBe('2024-01-05');
    });
  });
});
