import type { CheckboxEditor } from './checkbox';
import type { CustomEditor } from './custom';
import type { DateEditor } from './date';
import type { NumberEditor } from './number';
import type { SelectEditor } from './select';
import type { TextEditor } from './text';

/**
 * The editors that fit a column, based on the type of value it holds.
 *
 * | Column value  | Built-in editors   | Custom editor |
 * | ------------- | ------------------ | ------------- |
 * | `string`      | text, date, select | yes           |
 * | `number`      | number, select     | yes           |
 * | `boolean`     | checkbox, select   | yes           |
 * | anything else | none               | yes           |
 *
 * For built-in editors, `null` and `undefined` are ignored, so a
 * `string | null` column gets the same editors as a `string` column.
 * A custom editor keeps the full type, `null` included, because it receives
 * the row's value as it is.
 *
 * @typeParam Value - The column's value type.
 * @typeParam Row - The shape of one row. Only selects use it, for `options`
 *   functions and `dependsOn`.
 */
export type EditorFor<Value, Row> = EditorForValue<NonNullable<Value>, Row> | CustomEditor<Value>;

// The `[…]` around both sides stops TypeScript from checking each member of
// a union on its own. `'a' | 'b'` is checked as one string type.
type EditorForValue<Value, Row> = [Value] extends [string]
  ? TextEditor | DateEditor | SelectEditor<Value, Row>
  : [Value] extends [number]
    ? NumberEditor | SelectEditor<Value, Row>
    : [Value] extends [boolean]
      ? CheckboxEditor | SelectEditor<Value, Row>
      : never;

/**
 * Any editor config, whatever the column type.
 *
 * Internal: used where the exact column type is no longer known, like
 * `createEditor`. Users write `EditorFor` instead.
 *
 * The row is a plain record here: any field can be read, and `dependsOn` is
 * any string.
 */
export type AnyEditor =
  | TextEditor
  | NumberEditor
  | DateEditor
  | CheckboxEditor
  | SelectEditor<unknown, Record<string, unknown>>
  | CustomEditor<unknown>;
