import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

/** What a checkbox writes, for columns that don't hold `true`/`false`. */
export type CheckboxValues<Value> = {
  /** Written when the box is ticked. */
  readonly checked: Value;
  /** Written when it isn't. */
  readonly unchecked: Value;
};

/**
 * For `boolean` columns, or `string` and `number` columns with `values`. A
 * value that's neither stays as it is until the box is clicked.
 */
export type CheckboxEditor<Value = boolean> = BaseEditor & {
  /** Picks this editor. */
  readonly type: 'checkbox';
} & (0 extends 1 & Value
    ? {
        /** The column is `any`, so `values` can't be checked. */
        readonly values?: CheckboxValues<Value>;
      }
    : [Value] extends [boolean]
      ? {
          /** Only for columns that aren't `true`/`false`. */
          readonly values?: never;
        }
      : {
          /** What to write instead of `true` and `false`, like `{ checked: 'O', unchecked: 'N' }`. */
          readonly values: CheckboxValues<Value>;
        });

/** Builds the checkbox. It keeps the row's value as it is until the user clicks it. */
export function createCheckboxEditor(
  config: CheckboxEditor | CheckboxEditor<unknown>,
  context: EditorContext<unknown>,
): EditorInstance<unknown> {
  const { checked, unchecked } = config.values ?? {
    checked: true,
    unchecked: false,
  };
  let current = context.value;

  const input = document.createElement('input');
  input.type = 'checkbox';
  addClasses(input, ['tdb-input', 'tdb-input-checkbox'], context.className);

  /**
   * Only the `checked` value ticks the box. Anything else, `null` included,
   * shows unchecked but is kept.
   */
  const setValue = (value: unknown): void => {
    current = value;
    input.checked = value === checked;
  };

  setValue(context.value);

  input.addEventListener('change', () => {
    current = input.checked ? checked : unchecked;
    context.onChange(current);
  });

  return {
    element: input,
    getValue: () => current,
    setValue,
    focus: () => input.focus(),
    destroy: () => input.remove(),
  };
}
