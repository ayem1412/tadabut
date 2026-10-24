import { describe, expect, it, vi } from 'vitest';

import { createEditor } from '../../src/editors/create';

describe('createEditor', () => {
  it('creates a text editor', () => {
    const editor = createEditor({ type: 'text' }, { value: 'Amina', onChange: vi.fn() });

    expect((editor.element as HTMLInputElement).type).toBe('text');
    expect(editor.getValue()).toBe('Amina');
  });

  it('creates a number editor', () => {
    const editor = createEditor({ type: 'number' }, { value: 42, onChange: vi.fn() });

    expect((editor.element as HTMLInputElement).type).toBe('number');
    expect(editor.getValue()).toBe(42);
  });

  it('creates a date editor', () => {
    const editor = createEditor({ type: 'date' }, { value: '2024-01-05', onChange: vi.fn() });

    expect((editor.element as HTMLInputElement).type).toBe('date');
    expect(editor.getValue()).toBe('2024-01-05');
  });

  it('creates a checkbox editor', () => {
    const editor = createEditor({ type: 'checkbox' }, { value: true, onChange: vi.fn() });

    expect((editor.element as HTMLInputElement).type).toBe('checkbox');
    expect(editor.getValue()).toBe(true);
  });

  it('creates a select editor', () => {
    const editor = createEditor(
      {
        type: 'select',
        options: [
          { value: 1, label: 'Morocco' },
          { value: 2, label: 'France' },
        ],
      },
      { value: 2, onChange: vi.fn() },
    );

    expect(editor.element.tagName).toBe('SELECT');
    expect(editor.getValue()).toBe(2);
  });
});
