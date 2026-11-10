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
  | 'edit'
  | 'save'
  | 'cancel'
  | 'delete'
  | 'isEditing'
  | 'add'
  | 'isAdding'
  | 'saveNew'
  | 'cancelNew'
  | 'getSelected'
  | 'isSelected'
  | 'select'
  | 'deselect'
  | 'clearSelection'
>;

/** The core options, plus `ref`. */
export type TadabutProps<Row extends object> = TadabutOptions<Row> & {
  /**
   * Gives you the same methods as the core table: `edit`, `save`, `cancel`,
   * `delete`, `add`, `saveNew`, `cancelNew`, `isEditing`, `isAdding`,
   * `getSelected`, `isSelected`, `select`, `deselect` and `clearSelection`.
   */
  readonly ref?: Ref<TadabutHandle<Row>>;
};

/**
 * New `data` updates the table in place. Changing `columns`, `rowId`,
 * `dataTables`, `texts`, `totalRows` or `selection` rebuilds it (and closes
 * open rows, and clears the selection), so keep the objects stable with a
 * constant or `useMemo`. `editing`, `selection`, `classNames` and every `on…`
 * callback (and `confirmDelete`) can be inline: they're compared by value or
 * read through a ref.
 */
export function Tadabut<Row extends object>({
  data,
  columns,
  rowId,
  editing,
  classNames,
  dataTables,
  texts,
  totalRows,
  selection,
  onSelect,
  onSave,
  onAdd,
  onDelete,
  confirmDelete,
  onEditStart,
  onSaved,
  onAdded,
  onDeleted,
  onRowClick,
  onRowDoubleClick,
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
  /** The latest `onAdd`, so a new one doesn't rebuild the table. */
  const onAddRef = useRef(onAdd);
  /** The latest `onDelete`, so a new one doesn't rebuild the table. */
  const onDeleteRef = useRef(onDelete);
  /** The latest `confirmDelete`, so a new one doesn't rebuild the table. */
  const confirmDeleteRef = useRef(confirmDelete);
  /** The latest `onSelect`, so a new one doesn't rebuild the table. */
  const onSelectRef = useRef(onSelect);
  /** The latest `onEditStart`, so a new one doesn't rebuild the table. */
  const onEditStartRef = useRef(onEditStart);
  /** The latest `onSaved`, so a new one doesn't rebuild the table. */
  const onSavedRef = useRef(onSaved);
  /** The latest `onAdded`, so a new one doesn't rebuild the table. */
  const onAddedRef = useRef(onAdded);
  /** The latest `onDeleted`, so a new one doesn't rebuild the table. */
  const onDeletedRef = useRef(onDeleted);
  /** The latest `onRowClick`, so a new one doesn't rebuild the table. */
  const onRowClickRef = useRef(onRowClick);
  /** The latest `onRowDoubleClick`, so a new one doesn't rebuild the table. */
  const onRowDoubleClickRef = useRef(onRowDoubleClick);

  // Pulled out so inline objects don't trigger a rebuild every render.
  const mode = editing?.mode;
  const button = editing?.button;
  const doubleClick = editing?.doubleClick;
  const tableClass = classNames?.table;
  const buttonClass = classNames?.button;
  const editClass = classNames?.edit;
  const saveClass = classNames?.save;
  const cancelClass = classNames?.cancel;
  const deleteClass = classNames?.delete;
  const confirmClass = classNames?.confirm;
  const keepClass = classNames?.keep;
  const selectClass = classNames?.select;
  const selectionOn = Boolean(selection);
  const checkAll = typeof selection === 'object' ? selection.checkAll : undefined;
  // Only whether they're set changes the buttons, not which function it is.
  const hasDelete = onDelete !== undefined;
  const confirmWith =
    confirmDelete === false ? 'never' : confirmDelete === undefined ? 'inline' : 'function';

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let confirm: TadabutOptions<Row>['confirmDelete'];

    if (confirmWith === 'never') {
      confirm = false;
    } else if (confirmWith === 'function') {
      confirm = (row) => {
        const ask = confirmDeleteRef.current;

        // Always a function here: switching to anything else rebuilds.
        return typeof ask === 'function' ? ask(row) : true;
      };
    }

    const table = new Core(container, {
      data: dataRef.current,
      columns,
      rowId,
      editing: { mode, button, doubleClick },
      dataTables,
      texts,
      totalRows,
      selection: selectionOn && { checkAll },
      classNames: {
        table: tableClass,
        button: buttonClass,
        edit: editClass,
        save: saveClass,
        cancel: cancelClass,
        delete: deleteClass,
        confirm: confirmClass,
        keep: keepClass,
        select: selectClass,
      },
      onSave: (row, context) => onSaveRef.current?.(row, context),
      onAdd: (row) => onAddRef.current?.(row),
      onDelete: hasDelete ? (row) => onDeleteRef.current?.(row) : undefined,
      confirmDelete: confirm,
      onSelect: (rows) => onSelectRef.current?.(rows),
      onEditStart: (row) => onEditStartRef.current?.(row),
      onSaved: (row, context) => onSavedRef.current?.(row, context),
      onAdded: (row) => onAddedRef.current?.(row),
      onDeleted: (row) => onDeletedRef.current?.(row),
      onRowClick: (row, event) => onRowClickRef.current?.(row, event),
      onRowDoubleClick: (row, event) => onRowDoubleClickRef.current?.(row, event),
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
    totalRows,
    mode,
    button,
    doubleClick,
    tableClass,
    buttonClass,
    editClass,
    saveClass,
    cancelClass,
    deleteClass,
    confirmClass,
    keepClass,
    selectClass,
    selectionOn,
    checkAll,
    hasDelete,
    confirmWith,
  ]);

  useEffect(() => {
    dataRef.current = data;
    tableRef.current?.setData(data);
  }, [data]);

  useEffect(() => {
    onSaveRef.current = onSave;
    onAddRef.current = onAdd;
    onDeleteRef.current = onDelete;
    confirmDeleteRef.current = confirmDelete;
    onSelectRef.current = onSelect;
    onEditStartRef.current = onEditStart;
    onSavedRef.current = onSaved;
    onAddedRef.current = onAdded;
    onDeletedRef.current = onDeleted;
    onRowClickRef.current = onRowClick;
    onRowDoubleClickRef.current = onRowDoubleClick;
  });

  useImperativeHandle(
    ref,
    () => ({
      edit: (id) => tableRef.current?.edit(id) ?? false,
      save: (id) => tableRef.current?.save(id) ?? Promise.resolve(false),
      cancel: (id) => tableRef.current?.cancel(id),
      delete: (id) => tableRef.current?.delete(id) ?? Promise.resolve(false),
      add: (defaults) => tableRef.current?.add(defaults) ?? false,
      isAdding: () => tableRef.current?.isAdding() ?? false,
      saveNew: () => tableRef.current?.saveNew() ?? Promise.resolve(false),
      cancelNew: () => tableRef.current?.cancelNew(),
      isEditing: (id) => tableRef.current?.isEditing(id) ?? false,
      getSelected: () => tableRef.current?.getSelected() ?? [],
      isSelected: (id) => tableRef.current?.isSelected(id) ?? false,
      select: (ids) => tableRef.current?.select(ids),
      deselect: (ids) => tableRef.current?.deselect(ids),
      clearSelection: () => tableRef.current?.clearSelection(),
    }),
    [],
  );

  return <div ref={containerRef} />;
}
