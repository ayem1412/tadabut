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

import { type ReactElement, type Ref, useEffect, useImperativeHandle, useRef } from 'react';

import { Tadabut as Core, type TadabutOptions } from '../index';

/**
 * What a `ref` on the `Tadabut` component gets: the core's editing methods.
 * They work the same way, with the same return values.
 *
 * There is no `setData`: in React, the rows come from the `data` prop.
 *
 * @typeParam Row - The shape of one row.
 */
export type TadabutHandle<Row extends object> = Pick<
  Core<Row>,
  'edit' | 'save' | 'cancel' | 'isEditing'
>;

/**
 * Props of the React `Tadabut` component: the core options, plus `ref`.
 *
 * @typeParam Row - The shape of one row. Usually worked out from `data`.
 */
export type TadabutProps<Row extends object> = TadabutOptions<Row> & {
  /** Gets the editing methods, to call them from your own buttons or code. */
  readonly ref?: Ref<TadabutHandle<Row>>;
};

/**
 * A Tadabut table as a React component.
 *
 * React only renders an empty `<div>`. The table inside it is created and
 * owned by the core, so React never touches it.
 *
 * - New `data` updates the table in place: sorting, search and the current
 *   page are kept.
 * - New `columns`, `rowId`, `editing.mode` or `editing.button` rebuild the
 *   table, and any row being edited is lost. Define `columns` outside the
 *   component, or with `useMemo`.
 * - `onSave` can be a new function on every render. The table always calls
 *   the latest one, without being rebuilt.
 *
 * @typeParam Row - The shape of one row. Usually worked out from `data`.
 */
export function Tadabut<Row extends object>({
  data,
  columns,
  rowId,
  editing,
  onSave,
  ref,
}: TadabutProps<Row>): ReactElement {
  /** The empty `<div>` React renders. The core builds the table inside it. */
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * The live core table, for `setData` and the ref's methods.
   * `null` before the first build and after unmount.
   */
  const tableRef = useRef<Core<Row>>(null);

  /**
   * The latest `data`. When the table is rebuilt, it starts from the current
   * rows instead of the ones from the first render. Kept in a ref so `data`
   * stays out of the build effect's dependencies.
   */
  const dataRef = useRef(data);

  /**
   * The latest `onSave`. The core gets a function that never changes and
   * calls this one, so a new `onSave` doesn't rebuild the table.
   */
  const onSaveRef = useRef(onSave);

  const mode = editing?.mode;
  const button = editing?.button;

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const table = new Core(container, {
      data: dataRef.current,
      columns,
      rowId,
      editing: { mode, button },
      onSave: (row, context) => onSaveRef.current?.(row, context),
    });
    tableRef.current = table;

    return () => {
      table.destroy();
      tableRef.current = null;
    };
  }, [columns, rowId, mode, button]);

  useEffect(() => {
    dataRef.current = data;
    tableRef.current?.setData(data);
  }, [data]);

  // No dependencies: runs after every render, so the ref is never behind.
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  // The methods read tableRef when they're called, so they keep working
  // after a rebuild. With no table, they do nothing and return false.
  useImperativeHandle(
    ref,
    () => ({
      edit: (id) => tableRef.current?.edit(id) ?? false,
      save: (id) => tableRef.current?.save(id) ?? Promise.resolve(false),
      cancel: (id) => tableRef.current?.cancel(id),
      isEditing: (id) => tableRef.current?.isEditing(id) ?? false,
    }),
    [],
  );

  return <div ref={containerRef} />;
}
