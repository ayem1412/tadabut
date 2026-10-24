/**
 * Tadabut: a typed wrapper for DataTables with row editing, rich inputs and
 * chained selects.
 *
 * Only what is exported here is part of the public API. Everything else in
 * `src/` is internal and can change at any time.
 *
 * For React, use the `tadabut/react` entry point.
 *
 * @packageDocumentation
 */

export type { Column } from './columns/column';
export type { CheckboxEditor } from './editors/checkbox';
export type { DateEditor } from './editors/date';
export type { EditorFor } from './editors/editor';
export type { NumberEditor } from './editors/number';
export type { SelectEditor, SelectOption } from './editors/select';
export type { TextEditor } from './editors/text';
export type { TadabutOptions } from './table/options';
export { Tadabut } from './table/tadabut';
