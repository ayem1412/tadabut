import type { SelectorModifier } from 'datatables.net';

import type { TotalRows } from '../columns/total';

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
export function rowsFor(totalRows: TotalRows): SelectorModifier {
  switch (totalRows) {
    case 'searched':
      return { search: 'applied' };

    case 'all':
      return { search: 'none' };

    case 'page':
      return { page: 'current' };
  }
}
