import { describe, expect, it, vi } from 'vitest';

import { createEditor } from '../../src/editors/create';

describe('createEditor', () => {
  it('creates a text editor from a text config', () => {
    const editor = createEditor({ type: 'text' }, { value: 'Amina', onChange: vi.fn() });

    expect(editor.element).toBeInstanceOf(HTMLInputElement);
    expect(editor.getValue()).toBe('Amina');
  });

  it('throws for editors that are not implemented yet', () => {
    expect(() => createEditor({ type: 'checkbox' }, { value: true, onChange: vi.fn() })).toThrow(
      "'checkbox'",
    );
  });
});
