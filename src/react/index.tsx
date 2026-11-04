/**
 * The React component.
 *
 * @packageDocumentation
 * @module tadabut/react
 *
 * @example
 * ```tsx
 * import { Tadabut } from 'tadabut/react';
 *
 * <Tadabut data={employees} columns={columns} rowId='id' />
 * ```
 */

import { type ReactElement, type Ref, useEffect, useImperativeHandle, useRef } from 'react';

import { Tadabut as Core, type TadabutOptions } from '../index';

/** What the `ref` gets. No `setData`: change the `data` prop instead. */
export type TadabutHandle<Row extends object> = Pick<
  Core<Row>,
  'edit' | 'save' | 'cancel' | 'isEditing'
>;

/** The core options, plus `ref`. */
export type TadabutProps<Row extends object> = TadabutOptions<Row> & {
  /** Gives you `edit`, `save`, `cancel` and `isEditing`. */
  readonly ref?: Ref<TadabutHandle<Row>>;
};

/**
 * New `data` updates the table in place. Changing `columns`, `rowId`,
 * `dataTables` or `texts` rebuilds it (and closes open rows), so keep those
 * stable with a constant or `useMemo`. `editing`, `classNames` and `onSave` can be
 * inline: they're compared by value or read through a ref.
 */
export function Tadabut<Row extends object>({
  data,
  columns,
  rowId,
  editing,
  classNames,
  dataTables,
  texts,
  onSave,
  ref,
}: TadabutProps<Row>): ReactElement {
  /** The `<div>` the core builds the table in. */
  const containerRef = useRef<HTMLDivElement>(null);
  /** The core table. `null` before the first build and after unmount. */
  const tableRef = useRef<Core<Row>>(null);
  /** The latest rows, so a rebuild doesn't go back to the first ones. */
  const dataRef = useRef(data);
  /** The latest `onSave`, so a new one doesn't rebuild the table. */
  const onSaveRef = useRef(onSave);

  // Pulled out so inline objects don't trigger a rebuild every render.
  const mode = editing?.mode;
  const button = editing?.button;
  const tableClass = classNames?.table;
  const buttonClass = classNames?.button;
  const editClass = classNames?.edit;
  const saveClass = classNames?.save;
  const cancelClass = classNames?.cancel;

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
      dataTables,
      texts,
      classNames: {
        table: tableClass,
        button: buttonClass,
        edit: editClass,
        save: saveClass,
        cancel: cancelClass,
      },
      onSave: (row, context) => onSaveRef.current?.(row, context),
    });
    tableRef.current = table;

    return () => {
      table.destroy();
      tableRef.current = null;
    };
  }, [
    columns,
    rowId,
    dataTables,
    texts,
    mode,
    button,
    tableClass,
    buttonClass,
    editClass,
    saveClass,
    cancelClass,
  ]);

  useEffect(() => {
    dataRef.current = data;
    tableRef.current?.setData(data);
  }, [data]);

  useEffect(() => {
    onSaveRef.current = onSave;
  });

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
