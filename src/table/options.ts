import type { Column } from '../columns/column';

/**
 * Options for creating a Tadabut table.
 */
export type TadabutOptions = {
  /** The rows to show. One object per row. */
  readonly data: readonly Record<string, unknown>[];
  /** The columns to show, in order. */
  readonly columns: readonly Column[];
};
