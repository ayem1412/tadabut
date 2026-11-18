/**
 * Which rows something counts: every row matching the search (on every
 * page), every row, or the rows on the page shown.
 */
export type RowScope = 'searched' | 'all' | 'page';

/**
 * Which rows the totals count: a `RowScope`, or `'selected'` for the ticked
 * rows only, wherever they are. `'selected'` needs `selection`.
 */
export type TotalScope = RowScope | 'selected';
