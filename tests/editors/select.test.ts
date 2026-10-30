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

describe('select editor with an options function', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  type Place = { countryId: number };

  /** A loader you finish by hand, to control when the options arrive. */
  function manualLoader() {
    const calls: {
      row: Place;
      signal: AbortSignal;
      resolve: (list: SelectOption<number>[]) => void;
      reject: (error: unknown) => void;
    }[] = [];

    const options = (row: Place, { signal }: { signal: AbortSignal }) =>
      new Promise<SelectOption<number>[]>((resolve, reject) => {
        calls.push({ row, signal, resolve, reject });
      });

    return { options, calls };
  }

  function setupLoader(
    options: (
      row: Place,
      context: { signal: AbortSignal },
    ) => SelectOption<number>[] | Promise<SelectOption<number>[]>,
    value: number | null = 2,
  ) {
    const onChange = vi.fn();
    const editor = createSelectEditor<number, Place>(
      { type: 'select', options },
      { value, onChange },
    );
    const select = editor.element as HTMLSelectElement;
    document.body.appendChild(select);

    return { editor, select, onChange };
  }

  const labels = (select: HTMLSelectElement) =>
    [...select.options].map((option) => option.textContent);

  it('starts empty and keeps the starting value', () => {
    const { options } = manualLoader();
    const { editor, select } = setupLoader(options);

    expect(select.options).toHaveLength(0);
    expect(editor.getValue()).toBe(2);
  });

  it('shows Loading… then the options, with the value picked', async () => {
    const { options, calls } = manualLoader();
    const { editor, select } = setupLoader(options);

    const loading = editor.load({ countryId: 1 });

    expect(labels(select)).toEqual(['Loading…']);
    expect(select.disabled).toBe(true);
    expect(editor.getValue()).toBe(2);
    expect(calls[0]?.row).toEqual({ countryId: 1 });

    calls[0]?.resolve(countries);

    expect(await loading).toBe('loaded');
    expect(labels(select)).toEqual(['Morocco', 'France', 'Spain']);
    expect(select.disabled).toBe(false);
    expect(select.selectedIndex).toBe(1);
    expect(editor.getValue()).toBe(2);
  });

  it('shows a list given right away, with no Loading… step', async () => {
    const { editor, select } = setupLoader(() => countries);

    const loading = editor.load({ countryId: 1 });

    expect(labels(select)).toEqual(['Morocco', 'France', 'Spain']);
    expect(await loading).toBe('loaded');
  });

  it('keeps a value set while loading', async () => {
    const { options, calls } = manualLoader();
    const { editor, select } = setupLoader(options);
    const loading = editor.load({ countryId: 1 });

    editor.setValue(3);
    calls[0]?.resolve(countries);
    await loading;

    expect(editor.getValue()).toBe(3);
    expect(select.selectedIndex).toBe(2);
  });

  it('gives null when the value is not in the loaded options', async () => {
    const { options, calls } = manualLoader();
    const { editor, select } = setupLoader(options, 9);
    const loading = editor.load({ countryId: 1 });

    calls[0]?.resolve(countries);
    await loading;

    expect(editor.getValue()).toBeNull();
    expect(select.selectedIndex).toBe(-1);
  });

  it('ignores an answer that comes after a newer load', async () => {
    const { options, calls } = manualLoader();
    const { editor, select } = setupLoader(options);
    const first = editor.load({ countryId: 1 });
    const second = editor.load({ countryId: 2 });

    expect(calls[0]?.signal.aborted).toBe(true);

    calls[1]?.resolve([{ value: 2, label: 'Paris' }]);
    calls[0]?.resolve(countries);

    expect(await first).toBe('cancelled');
    expect(await second).toBe('loaded');
    expect(labels(select)).toEqual(['Paris']);
  });

  it('stays empty and disabled when the function throws', async () => {
    const { options, calls } = manualLoader();
    const { editor, select } = setupLoader(options);
    const loading = editor.load({ countryId: 1 });

    calls[0]?.reject(new Error('Network down'));

    expect(await loading).toBe('failed');
    expect(select.disabled).toBe(true);
    expect(labels(select)).toEqual(['']);
  });

  it('gives cancelled, not failed, when a stopped load throws', async () => {
    const { options, calls } = manualLoader();
    const { editor } = setupLoader(options);
    const first = editor.load({ countryId: 1 });
    void editor.load({ countryId: 2 });

    calls[0]?.reject(new DOMException('Aborted', 'AbortError'));

    expect(await first).toBe('cancelled');
  });

  it('aborts the running load on destroy', async () => {
    const { options, calls } = manualLoader();
    const { editor } = setupLoader(options);
    const loading = editor.load({ countryId: 1 });

    editor.destroy();
    calls[0]?.resolve(countries);

    expect(calls[0]?.signal.aborted).toBe(true);
    expect(await loading).toBe('cancelled');
  });

  it('reports a picked option after loading', async () => {
    const { options, calls } = manualLoader();
    const { editor, select, onChange } = setupLoader(options);
    const loading = editor.load({ countryId: 1 });
    calls[0]?.resolve(countries);
    await loading;

    choose(select, 0);

    expect(onChange).toHaveBeenCalledWith(1);
    expect(editor.getValue()).toBe(1);
  });

  it('gives loaded right away for a fixed list', async () => {
    const { editor, select } = setup(2);

    expect(await editor.load({})).toBe('loaded');
    expect(select.selectedIndex).toBe(1);
  });
});
