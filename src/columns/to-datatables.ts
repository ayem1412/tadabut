import type { ColumnOptions } from 'datatables.net';

import type { Column } from './column';

/**
 * Turns Tadabut columns into DataTables column settings.
 *
 * Internal: not exported from the package. It is the only place that knows
 * DataTables' column names, so a DataTables change only touches this file.
 */
export function toDataTables(columns: readonly Column[]): ColumnOptions[] {
  return columns.map(({ title, prop }) => ({ title, data: prop }));
}
