import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSelectEditor, type SelectOption } from '../../src/editors/select';

const countries: SelectOption<number>[] = [
  { value: 1, label: 'Morocco' },
  { value: 2, label: 'France' },
  { value: 3, label: 'Spain' },
];

function setup(
  value: number | null = 1,
  options: readonly SelectOption<number>[] = countries,
  className?: string,
) {
  const onChange = vi.fn();
  const editor = createSelectEditor({ type: 'select', options }, { value, onChange, className });
  const select = editor.element as HTMLSelectElement;
  document.body.appendChild(select);

  return { editor, select, onChange };
}

function choose(select: HTMLSelectElement, index: number): void {
  select.selectedIndex = index;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('select editor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is a select with one option per entry', () => {
    const { select } = setup();

    expect(select.tagName).toBe('SELECT');
    expect([...select.options].map((option) => option.textContent)).toEqual([
      'Morocco',
      'France',
      'Spain',
    ]);
  });

  it('picks the option matching the starting value', () => {
    const { editor, select } = setup(2);

    expect(select.selectedIndex).toBe(1);
    expect(editor.getValue()).toBe(2);
  });

  it('picks nothing and gives null when the value is null', () => {
    const { editor, select } = setup(null);

    expect(select.selectedIndex).toBe(-1);
    expect(editor.getValue()).toBeNull();
  });

  it('picks nothing and gives null when no option matches', () => {
    const { editor, select } = setup(99);

    expect(select.selectedIndex).toBe(-1);
    expect(editor.getValue()).toBeNull();
  });

  it('works with no options', () => {
    const { editor, select } = setup(null, []);

    expect(select.options).toHaveLength(0);
    expect(editor.getValue()).toBeNull();
  });

  it('has the Tadabut classes and className', () => {
    const { select } = setup(1, countries, 'border rounded');

    expect([...select.classList]).toEqual(['tdb-input', 'tdb-input-select', 'border', 'rounded']);
  });

  it('reports the real value type, not a string', () => {
    const { editor, select, onChange } = setup(1);

    choose(select, 2);

    expect(editor.getValue()).toBe(3);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('shows a value set from code without calling onChange', () => {
    const { editor, select, onChange } = setup(1);

    editor.setValue(3);
    expect(select.selectedIndex).toBe(2);

    editor.setValue(null);
    expect(select.selectedIndex).toBe(-1);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes itself on destroy', () => {
    const { editor, select } = setup();

    editor.destroy();

    expect(document.body.contains(select)).toBe(false);
  });
});
