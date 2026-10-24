import { afterEach, describe, expect, it, vi } from 'vitest';

import { type CheckboxEditor, createCheckboxEditor } from '../../src/editors/checkbox';

function setup(config: Omit<CheckboxEditor, 'type'> = {}, value: boolean | null = true) {
  const onChange = vi.fn();
  const editor = createCheckboxEditor({ type: 'checkbox', ...config }, { value, onChange });
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

  it('shows null as unchecked and gives false', () => {
    const { editor, input } = setup({}, null);

    expect(input.checked).toBe(false);
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
