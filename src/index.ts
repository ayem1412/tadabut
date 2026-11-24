/**
 * Editable, typed DataTables. The React component lives in `tadabut/react`.
 *
 * @packageDocumentation
 * @module tadabut
 */

export type { Column } from './columns/column';
export { html } from './columns/html';
export type { TotalFunction } from './columns/total';
export type { CheckboxEditor } from './editors/checkbox';
export type { CustomEditor } from './editors/custom';
export type { DateEditor } from './editors/date';
export { type DateFormat, defaultDateFormat, formatDate, parseDate } from './editors/date-format';
export type { DateTimeEditor } from './editors/datetime';
export { formatDateTime, parseDateTime } from './editors/datetime-format';
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
export type { TimeEditor } from './editors/time';
export { formatTime, parseTime } from './editors/time-format';
export type { DefaultOptions } from './table/defaults';
export type { TadabutEventName, TadabutEvents, TadabutListener } from './table/events';
export type {
  ButtonIcons,
  DataTablesSettings,
  DetailContent,
  DetailContext,
  EditingOptions,
  SaveContext,
  SelectionOptions,
  ServerFunction,
  ServerRequest,
  ServerResponse,
  TableClassNames,
  TadabutOptions,
} from './table/options';
export type { RowScope, TotalScope } from './table/scope';
export type { TadabutClass } from './table/tadabut';
export { Tadabut } from './table/tadabut';
export { en } from './texts/en';
export { fr } from './texts/fr';
export type { Texts } from './texts/texts';
export type { ValidationOptions } from './validation/rules';
