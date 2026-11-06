import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMoneyEditor, type MoneyEditor } from '../../src/editors/money';

function setup(config: Omit<MoneyEditor, 'type'> = {}, value: number | null = 12500) {
  const onChange = vi.fn();
  const { className, ...options } = config;
  const editor = createMoneyEditor({ type: 'money', ...options }, { value, onChange, className });
  const input = editor.element as HTMLInputElement;
  document.body.appendChild(input);

  /** Replaces the text and puts the cursor at `caret`, like typing would. */
  const type = (text: string, caret = text.length) => {
    input.value = text;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  return { editor, input, onChange, type };
}

describe('money editor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is a text input with the number keyboard', () => {
    const { input } = setup();

    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('decimal');
    expect([...input.classList]).toEqual(['tdb-input', 'tdb-input-money']);
  });

  it('starts fully formatted, and empty for null', () => {
    expect(setup().input.value).toBe('12 500.00');
    expect(setup({}, null).input.value).toBe('');
  });

  it('regroups while typing and reports the number', () => {
    const { input, onChange, type } = setup({}, null);

    type('12500');

    expect(input.value).toBe('12 500');
    expect(onChange).toHaveBeenLastCalledWith(12500);
  });

  it('keeps the cursor after the digit that was typed', () => {
    const { input, type } = setup({}, null);
    type('12500');

    // "9" typed after "12": the browser gives "129 500" with the cursor at 3.
    type('129 500', 3);

    expect(input.value).toBe('129 500');
    expect(input.selectionStart).toBe(3);

    // "4" typed after "1": "1429 500" → "1 429 500", cursor after the 4.
    type('1429 500', 2);

    expect(input.value).toBe('1 429 500');
    expect(input.selectionStart).toBe(3);
  });

  it('leaves the cursor alone when nothing needs regrouping', () => {
    const { input, type } = setup({}, null);

    type('125', 1);

    expect(input.selectionStart).toBe(1);
  });

  it('fills in the decimals on blur, and rounds', () => {
    const { input, editor, type } = setup({}, null);

    type('12,5');
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('12.50');

    input.value = '12.345';
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('12.35');
    expect(editor.getValue()).toBe(12.35);
  });

  it('empties the field on blur when it holds no number', () => {
    const { input, editor, type } = setup();

    type('-');
    input.dispatchEvent(new Event('blur'));

    expect(input.value).toBe('');
    expect(editor.getValue()).toBeNull();
  });

  it('follows decimals, separator and point', () => {
    const { input, type } = setup({ separator: '.', point: ',', decimals: 1 }, 12500.25);

    expect(input.value).toBe('12.500,3');

    type('1234,56');
    expect(input.value).toBe('1.234,5');
  });

  it('shows a value set from code', () => {
    const { input, editor, onChange } = setup();

    editor.setValue(99);

    expect(input.value).toBe('99.00');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('only listens to its own input', () => {
    const { input, onChange } = setup();
    const other = document.createElement('input');
    document.body.appendChild(other);

    other.value = '5';
    other.dispatchEvent(new Event('input', { bubbles: true }));

    expect(input.value).toBe('12 500.00');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes itself on destroy', () => {
    const { editor, input } = setup();

    editor.destroy();

    expect(document.body.contains(input)).toBe(false);
  });
});
