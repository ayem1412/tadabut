import { describe, expect, it, vi } from 'vitest';

import { createEditor } from '../../src/editors/create';
import type { EditorContext, EditorInstance } from '../../src/index';

function fakeEditor(): EditorInstance<unknown> {
  return {
    element: document.createElement('div'),
    getValue: vi.fn(),
    setValue: vi.fn(),
    focus: vi.fn(),
    destroy: vi.fn(),
  };
}

describe('custom editor', () => {
  it('calls create once, with the value and the className', () => {
    const create = vi.fn((_context: EditorContext<unknown>) => fakeEditor());
    const onChange = vi.fn();

    createEditor({ type: 'custom', create, className: 'border' }, { value: 'Amina', onChange });

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      value: 'Amina',
      className: 'border',
    });
  });

  it('returns exactly what create returned', () => {
    const editor = fakeEditor();

    const result = createEditor(
      { type: 'custom', create: () => editor },
      { value: null, onChange: vi.fn() },
    );

    expect(result).toBe(editor);
  });

  it('passes the onChange from the context through', () => {
    const onChange = vi.fn();

    createEditor(
      {
        type: 'custom',
        create: (context) => {
          context.onChange('Salma');
          return fakeEditor();
        },
      },
      { value: 'Amina', onChange },
    );

    expect(onChange).toHaveBeenCalledWith('Salma');
  });
});
