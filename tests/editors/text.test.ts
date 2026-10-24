import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TextEditor } from '../../src/editors/text';
import { createTextEditor } from '../../src/editors/text';

function setup(config: Omit<TextEditor, 'type'> = {}, value: string | null = 'Amina') {
  const onChange = vi.fn();
  const editor = createTextEditor(
    { type: 'text', ...config },
    { value: value as string, onChange },
  );
  const input = editor.element as HTMLInputElement;
  document.body.appendChild(input);

  return { editor, input, onChange };
}

function type(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('text editor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is a text input', () => {
    const { input } = setup();

    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('text');
  });

  it('shows the starting value', () => {
    const { input } = setup({}, 'Amina');

    expect(input.value).toBe('Amina');
  });

  it('shows null as empty', () => {
    const { input } = setup({}, null);

    expect(input.value).toBe('');
  });

  it('has the Tadabut classes', () => {
    const { input } = setup();

    expect([...input.classList]).toEqual(['tdb-input', 'tdb-input-text']);
  });

  it('adds every class from className, ignoring extra spaces', () => {
    const { input } = setup({ className: ' border  rounded ' });

    expect([...input.classList]).toEqual(['tdb-input', 'tdb-input-text', 'border', 'rounded']);
  });

  it('sets the validation attributes that are given', () => {
    const { input } = setup({
      minLength: 2,
      maxLength: 0,
      pattern: '[A-Z]+',
    });

    expect(input.minLength).toBe(2);
    expect(input.maxLength).toBe(0);
    expect(input.pattern).toBe('[A-Z]+');
  });

  it('leaves out the validation attributes that are not given', () => {
    const { input } = setup();

    expect(input.hasAttribute('minlength')).toBe(false);
    expect(input.hasAttribute('maxlength')).toBe(false);
    expect(input.hasAttribute('pattern')).toBe(false);
  });

  it('reports what the user types', () => {
    const { editor, input, onChange } = setup();

    type(input, 'Salma');

    expect(editor.getValue()).toBe('Salma');
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('Salma');
  });

  it('works when its methods are passed around', () => {
    const { editor, input } = setup();
    const { getValue, setValue } = editor;

    setValue('Karim');

    expect(getValue()).toBe('Karim');
    expect(input.value).toBe('Karim');
  });

  it('shows a value set from code without calling onChange', () => {
    const { editor, input, onChange } = setup();

    editor.setValue('Nadia');

    expect(input.value).toBe('Nadia');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('can be focused', () => {
    const { editor, input } = setup();

    editor.focus();

    expect(document.activeElement).toBe(input);
  });

  it('removes itself on destroy', () => {
    const { editor, input } = setup();

    editor.destroy();

    expect(document.body.contains(input)).toBe(false);
  });
});
