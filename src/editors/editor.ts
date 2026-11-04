import type { CheckboxEditor } from './checkbox';
import type { CustomEditor } from './custom';
import type { DateEditor } from './date';
import type { NumberEditor } from './number';
import type { SelectEditor } from './select';
import type { TextEditor } from './text';

/**
 * Which editors a column can have, from its value type:
 *
 * | Column value  | Built-in editors   |
 * | ------------- | ------------------ |
 * | `string`      | text, date, select |
 * | `number`      | number, select     |
 * | `boolean`     | checkbox, select   |
 *
 * `custom` works on anything. Nullable columns get the same editors as
 * non-nullable ones.
 */
export type EditorFor<Value, Row> = EditorForValue<NonNullable<Value>, Row> | CustomEditor<Value>;

// Wrapped in [] so a union like 'a' | 'b' isn't distributed.
/** The built-in editors for a non-null value type. */
type EditorForValue<Value, Row> = [Value] extends [string]
  ? TextEditor | DateEditor | SelectEditor<Value, Row>
  : [Value] extends [number]
    ? NumberEditor | SelectEditor<Value, Row>
    : [Value] extends [boolean]
      ? CheckboxEditor | SelectEditor<Value, Row>
      : never;

/** For internal code that no longer knows the column's type. */
export type AnyEditor =
  | TextEditor
  | NumberEditor
  | DateEditor
  | CheckboxEditor
  | SelectEditor<unknown, Record<string, unknown>>
  | CustomEditor<unknown>;
