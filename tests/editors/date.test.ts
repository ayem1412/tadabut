import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDateEditor, type DateEditor } from '../../src/editors/date';

function setup(config: Omit<DateEditor, 'type'> = {}, value: string | null = '2024-01-05') {
  const onChange = vi.fn();
  const editor = createDateEditor({ type: 'date', ...config }, { value, onChange });
  const input = editor.element as HTMLInputElement;
  document.body.appendChild(input);

  return { editor, input, onChange };
}

function pick(input: HTMLInputElement, date: string): void {
  input.value = date;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('date editor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

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

  it('shows other date formats as empty', () => {
    const { editor, input } = setup({}, '2024-01-05T00:00:00');

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
});
