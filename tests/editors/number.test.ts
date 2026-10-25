import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNumberEditor, type NumberEditor } from '../../src/editors/number';

function setup(config: Omit<NumberEditor, 'type'> = {}, value: number | null = 42) {
  const { className, ...options } = config;
  const onChange = vi.fn();
  const editor = createNumberEditor({ type: 'number', ...options }, { value, onChange, className });
  const input = editor.element as HTMLInputElement;
  document.body.appendChild(input);

  return { editor, input, onChange };
}

function type(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('number editor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is a number input', () => {
    const { input } = setup();

    expect(input.type).toBe('number');
  });

  it('shows the starting value', () => {
    const { editor, input } = setup({}, 42);

    expect(input.value).toBe('42');
    expect(editor.getValue()).toBe(42);
  });

  it('shows null as empty', () => {
    const { editor, input } = setup({}, null);

    expect(input.value).toBe('');
    expect(editor.getValue()).toBeNull();
  });

  it('shows 0 as 0, not as empty', () => {
    const { editor, input } = setup({}, 0);

    expect(input.value).toBe('0');
    expect(editor.getValue()).toBe(0);
  });

  it('has the Tadabut classes and className', () => {
    const { input } = setup({ className: 'border' });

    expect([...input.classList]).toEqual(['tdb-input', 'tdb-input-number', 'border']);
  });

  it('sets the attributes that are given', () => {
    const { input } = setup({ min: 0, max: 100, step: 'any' });

    expect(input.min).toBe('0');
    expect(input.max).toBe('100');
    expect(input.step).toBe('any');
  });

  it('leaves out the attributes that are not given', () => {
    const { input } = setup();

    expect(input.hasAttribute('min')).toBe(false);
    expect(input.hasAttribute('max')).toBe(false);
    expect(input.hasAttribute('step')).toBe(false);
  });

  it('reports a number, not a string', () => {
    const { editor, input, onChange } = setup();

    type(input, '7.5');

    expect(editor.getValue()).toBe(7.5);
    expect(onChange).toHaveBeenCalledWith(7.5);
  });

  it('reports null when cleared, not 0 or NaN', () => {
    const { editor, input, onChange } = setup();

    type(input, '');

    expect(editor.getValue()).toBeNull();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows a value set from code without calling onChange', () => {
    const { editor, input, onChange } = setup();

    editor.setValue(null);
    expect(input.value).toBe('');

    editor.setValue(5);
    expect(input.value).toBe('5');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes itself on destroy', () => {
    const { editor, input } = setup();

    editor.destroy();

    expect(document.body.contains(input)).toBe(false);
  });
});
