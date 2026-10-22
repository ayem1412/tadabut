/**
 * React adapter for Tadabut.
 *
 * @example
 * import { Tadabut } from 'tadabut/react';
 *
 * <Tadabut data={employees} columns={columns} rowId='id' />
 *
 * @packageDocumentation
 */

import { type ReactElement, useEffect, useRef } from 'react';

import { Tadabut as Core, type TadabutOptions } from '../index';

/**
 * Props of the React `Tadabut` component. Same as the core options.
 *
 * @typeParam Row - The shape of one row. Usually worked out from `data`.
 */
export type TadabutProps<Row extends object> = TadabutOptions<Row>;

/**
 * A Tadabut table as a React component.
 *
 * React only renders an empty `<div>`. The table inside it is created and
 * owned by the core, so React never touches it.
 *
 * New `data` updates the table in place: sorting, search and the current page
 * are kept. New `columns` or `rowId` rebuild the table, so define `columns`
 * outside the component, or with `useMemo`.
 *
 * @typeParam Row - The shape of one row. Usually worked out from `data`.
 */
export function Tadabut<Row extends object>({
  data,
  columns,
  rowId,
}: TadabutProps<Row>): ReactElement {
  /** The empty `<div>` React renders. The core builds the table inside it. */
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * The live core table, so the data effect can call `setData` on it.
   * `null` before the first build and after unmount.
   */
  const tableRef = useRef<Core<Row>>(null);

  /**
   * The latest `data`. When new `columns` or `rowId` rebuild the table, it
   * starts from the current rows instead of the ones from the first render.
   * Kept in a ref so `data` stays out of the build effect's dependencies.
   */
  const dataRef = useRef(data);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const table = new Core(container, {
      data: dataRef.current,
      columns,
      rowId,
    });
    tableRef.current = table;

    return () => {
      table.destroy();
      tableRef.current = null;
    };
  }, [columns, rowId]);

  useEffect(() => {
    dataRef.current = data;
    tableRef.current?.setData(data);
  }, [data]);

  return <div ref={containerRef} />;
}
