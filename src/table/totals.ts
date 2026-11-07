import type { SelectorModifier } from 'datatables.net';

import type { Column } from '../columns/column';
import type { NumberTotal, TotalFunction } from '../columns/total';
import type { AnyEditor } from '../editors/editor';
import { moneyFormat } from '../editors/money';
import { formatMoney } from '../editors/money-format';
import type { RowScope } from './scope';

/**
 * An empty footer, one cell per column. It must be in the table before
 * DataTables starts, or DataTables won't manage it.
 */
export function footerFor(cellCount: number): HTMLTableSectionElement {
  const tfoot = document.createElement('tfoot');
  tfoot.classList.add('tdb-totals');

  const tr = document.createElement('tr');

  for (let index = 0; index < cellCount; index++) {
    tr.append(document.createElement('th'));
  }

  tfoot.append(tr);

  return tfoot;
}

/** The DataTables filter for each `totalRows`. */
export function rowsFor(totalRows: RowScope): SelectorModifier {
  switch (totalRows) {
    case 'searched':
      return { search: 'applied' };

    case 'all':
      return { search: 'none' };

    case 'page':
      return { page: 'current' };
  }
}

/** `Column<Row>` is a union per field, which makes `render` uncallable here. */
type LooseColumn<Row extends object> = {
  /** The field the column shows. */
  readonly prop: string;
  /** The column's total, with its value type erased. */
  readonly total?: NumberTotal | 'count' | TotalFunction<Row>;
  /** The column's `render`, with its value type erased. */
  readonly render?: (value: unknown, row: Row) => string;
  /** The column's editor config. */
  readonly editor?: AnyEditor;
};

/** The text under a column: `count` and functions as they are, numbers formatted like the cells. */
export function totalText<Row extends object>(column: Column<Row>, rows: readonly Row[]): string {
  const { prop, total, render, editor } = column as LooseColumn<Row>;

  if (total === undefined) {
    return '';
  }

  if (typeof total === 'function') {
    return total(rows);
  }

  if (total === 'count') {
    return String(rows.length);
  }

  const values = rows
    .map((row) => (row as Record<string, unknown>)[prop])
    .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));

  const result = compute(total, values);

  if (result === undefined) {
    return '';
  }

  if (editor?.type === 'money' && render === undefined) {
    return formatMoney(result, moneyFormat(editor));
  }

  // So an average is 31.67, not 31.666666666666668, and 0.1 + 0.2 is 0.3.
  const rounded = Math.round(result * 100) / 100;

  // A total isn't a row, so render gets an empty one.
  return render === undefined ? String(rounded) : render(rounded, {} as Row);
}

/** `undefined` when there's nothing to average, or no smallest or biggest. */
function compute(total: NumberTotal, values: readonly number[]): number | undefined {
  const sum = values.reduce((a, b) => a + b, 0);

  if (total === 'sum') {
    return sum;
  }

  if (values.length === 0) {
    return undefined;
  }

  switch (total) {
    case 'avg':
      return sum / values.length;

    case 'min':
      return Math.min(...values);

    case 'max':
      return Math.max(...values);
  }
}
