import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

/** For `boolean` columns. `null` shows unchecked; it never returns `null`. */
export type CheckboxEditor = BaseEditor & {
  /** Picks this editor. */
  readonly type: 'checkbox';
};

/**
 * Builds the checkbox. `_config` is unused for now, but keeps the same
 * shape as the other editors.
 */
export function createCheckboxEditor(
  _config: CheckboxEditor,
  context: EditorContext<boolean | null>,
): EditorInstance<boolean> {
  const input = document.createElement('input');
  input.type = 'checkbox';
  addClasses(input, ['tdb-input', 'tdb-input-checkbox'], context.className);

  /** `null` shows as unchecked. */
  const setValue = (value: boolean | null): void => {
    input.checked = value === true;
  };

  setValue(context.value);

  input.addEventListener('change', () => context.onChange(input.checked));

  return {
    element: input,
    getValue: () => input.checked,
    setValue,
    focus: () => input.focus(),
    destroy: () => input.remove(),
  };
}
