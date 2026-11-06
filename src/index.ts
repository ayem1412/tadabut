/**
 * Editable, typed DataTables. The React component lives in `tadabut/react`.
 *
 * @packageDocumentation
 * @module tadabut
 */

export type { Column } from './columns/column';
export type { TotalFunction, TotalRows } from './columns/total';
export type { CheckboxEditor } from './editors/checkbox';
export type { CustomEditor } from './editors/custom';
export type { DateEditor } from './editors/date';
export type { EditorFor } from './editors/editor';
export type { EditorContext, EditorInstance } from './editors/instance';
export type { MoneyEditor } from './editors/money';
export { defaultMoneyFormat, formatMoney, type MoneyFormat } from './editors/money-format';
export type { NumberEditor } from './editors/number';
export type {
  OptionsContext,
  SelectEditor,
  SelectOption,
  SelectOptionsLoader,
} from './editors/select';
export type { TextEditor } from './editors/text';
export type {
  DataTablesSettings,
  EditingOptions,
  SaveContext,
  TableClassNames,
  TadabutOptions,
} from './table/options';
export { Tadabut } from './table/tadabut';
export { en } from './texts/en';
export { fr } from './texts/fr';
export type { Texts } from './texts/texts';
export type { ValidationOptions } from './validation/rules';
