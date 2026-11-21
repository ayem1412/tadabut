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

import type { Api } from 'datatables.net';
import {
  type ReactElement,
  type ReactNode,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { Tadabut as Core, type DetailContext, type TadabutOptions } from '../index';

/**
 * What the `ref` gets. No `setData` or `setEditable`: change the `data` and
 * `editable` props instead. Before
 * the table is built, `getApi` gives `undefined`.
 */
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
  | 'setCurrent'
  | 'getCurrent'
  | 'isCurrent'
  | 'openDetail'
  | 'closeDetail'
  | 'toggleDetail'
  | 'isDetailOpen'
  | 'getData'
  | 'getRow'
  | 'insertRow'
  | 'updateRow'
  | 'removeRow'
  | 'getTotals'
  | 'getOptions'
> & {
  /** The DataTables API, or `undefined` before the table is built. */
  readonly getApi: () => Api<Row> | undefined;
};

/** The core options, with `detail` returning JSX, plus `ref`. */
export type TadabutProps<Row extends object> = Omit<TadabutOptions<Row>, 'detail'> & {
  /**
   * Adds a ▸ button at the start of each row. It opens a line under the row
   * with what this returns: any JSX, so hooks, state and your components
   * work inside. May be async: "Loading…" shows while it waits, and the
   * error message if it throws. It runs again after the row is saved. Needs
   * `rowId`.
   *
   * @example
   * detail={(row) => <OrderLines orderId={row.id} />}
   */
  readonly detail?: (row: Row, context: DetailContext) => ReactNode | Promise<ReactNode>;
  /**
   * Gives you the same methods as the core table: `edit`, `save`, `cancel`,
   * `delete`, `add`, `saveNew`, `cancelNew`, `isEditing`, `isAdding`,
   * `getSelected`, `isSelected`, `select`, `deselect`, `clearSelection`,
   * `setCurrent`, `getCurrent`, `isCurrent`, `openDetail`, `closeDetail`, `toggleDetail`, `isDetailOpen`, `getData`,
   * `getRow`, `getApi`, `insertRow`, `updateRow`, `removeRow`, `getTotals`
   * and `getOptions`.
   */
  readonly ref?: Ref<TadabutHandle<Row>>;
};

/** An open detail: where it goes, and what React draws there. */
type Detail = {
  /** The `<div>` the core put under the row. */
  readonly element: HTMLDivElement;
  /** What `detail` returned. */
  readonly content: ReactNode;
};

/**
 * New `data` updates the table in place. Changing `columns`, `rowId`,
 * `dataTables`, `texts`, `totalRows`, `selection`, `currentRow` or the values
 * in `autoAdd` rebuilds it (and closes open rows and details, and clears the
 * selection and the highlight), so keep the objects stable with a constant or `useMemo`. `editing`, `selection`, `classNames`, `icons`,
 * `detail` and every `on…` callback (and `confirmDelete`) can be inline:
 * they're compared by value or read through a ref.
 */
export function Tadabut<Row extends object>({
  data,
  columns,
  rowId,
  editing,
  classNames,
  icons,
  dataTables,
  texts,
  totalRows,
  selection,
  onSelect,
  currentRow,
  onCurrentChange,
  editable = true,
  autoAdd,
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
  detail,
  ref,
}: TadabutProps<Row>): ReactElement {
  /** The `<div>` the core builds the table in. */
  const containerRef = useRef<HTMLDivElement>(null);
  /** The core table. `null` before the first build and after unmount. */
  const tableRef = useRef<Core<Row>>(null);
  /** The latest rows, so a rebuild doesn't go back to the first ones. */
  const dataRef = useRef(data);
  /** The latest `autoAdd`. Its text is what rebuilds, so a Date in it stays a Date. */
  const autoAddRef = useRef(autoAdd);
  autoAddRef.current = autoAdd;
  /** The latest `editable`, so a rebuild starts the way it is now. */
  const editableRef = useRef(editable);
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
  /** The latest `onCurrentChange`, so a new one doesn't rebuild the table. */
  const onCurrentChangeRef = useRef(onCurrentChange);
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
  /** The latest `detail`, so a new one doesn't rebuild the table. */
  const detailRef = useRef(detail);
  /** The next key for an open detail. Never reused, so a reload gets a fresh one. */
  const nextKeyRef = useRef(0);
  /** The open details React draws into, by key. */
  const [details, setDetails] = useState<ReadonlyMap<number, Detail>>(() => new Map());

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
  const detailClass = classNames?.detail;
  const currentClass = classNames?.current;
  // As text, so `icons={{ edit: 'fa fa-pencil' }}` inline doesn't rebuild the table.
  const iconsKey = JSON.stringify(icons ?? {});
  const selectionOn = Boolean(selection);
  const checkAll = typeof selection === 'object' ? selection.checkAll : undefined;
  // Only whether they're set changes the buttons, not which function it is.
  const hasDelete = onDelete !== undefined;
  const confirmWith =
    confirmDelete === false ? 'never' : confirmDelete === undefined ? 'inline' : 'function';
  const hasDetail = detail !== undefined;
  // As text, so a new object with the same values doesn't rebuild the table.
  const autoAddKey = autoAdd === undefined ? undefined : JSON.stringify(autoAdd);

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
      editable: editableRef.current,
      // The key says whether it's on, the ref gives the values as they are.
      autoAdd: autoAddKey === undefined ? undefined : autoAddRef.current,
      columns,
      rowId,
      editing: { mode, button, doubleClick },
      dataTables,
      texts,
      totalRows,
      selection: selectionOn && { checkAll },
      currentRow,
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
        detail: detailClass,
        current: currentClass,
      },
      icons: JSON.parse(iconsKey),
      onSave: (row, context) => onSaveRef.current?.(row, context),
      onAdd: (row) => onAddRef.current?.(row),
      onDelete: hasDelete ? (row) => onDeleteRef.current?.(row) : undefined,
      confirmDelete: confirm,
      onSelect: (rows) => onSelectRef.current?.(rows),
      onCurrentChange: (row) => onCurrentChangeRef.current?.(row),
      onEditStart: (row) => onEditStartRef.current?.(row),
      onSaved: (row, context) => onSavedRef.current?.(row, context),
      onAdded: (row) => onAddedRef.current?.(row),
      onDeleted: (row) => onDeletedRef.current?.(row),
      onRowClick: (row, event) => onRowClickRef.current?.(row, event),
      onRowDoubleClick: (row, event) => onRowDoubleClickRef.current?.(row, event),
      // The core shows a <div>, and React draws the JSX into it with a portal.
      detail: hasDetail
        ? async (row, context) => {
            const content = await detailRef.current?.(row, context);

            // Closed while it loaded: the core ignores what we return.
            if (context.signal.aborted) {
              return '';
            }

            const key = nextKeyRef.current++;
            const element = document.createElement('div');

            setDetails((previous) => new Map(previous).set(key, { element, content }));

            // The core aborts the signal when the detail closes, reloads, or
            // the table goes away, even after it loaded.
            context.signal.addEventListener(
              'abort',
              () =>
                setDetails((previous) => {
                  const next = new Map(previous);
                  next.delete(key);
                  return next;
                }),
              { once: true },
            );

            return element;
          }
        : undefined,
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
    detailClass,
    currentClass,
    iconsKey,
    selectionOn,
    currentRow,
    checkAll,
    hasDelete,
    confirmWith,
    hasDetail,
    autoAddKey,
  ]);

  useEffect(() => {
    dataRef.current = data;
    tableRef.current?.setData(data);
  }, [data]);

  // Without a rebuild, so ticks, details and sorting stay.
  useEffect(() => {
    editableRef.current = editable;
    tableRef.current?.setEditable(editable);
  }, [editable]);

  useEffect(() => {
    onSaveRef.current = onSave;
    onAddRef.current = onAdd;
    onDeleteRef.current = onDelete;
    confirmDeleteRef.current = confirmDelete;
    onSelectRef.current = onSelect;
    onCurrentChangeRef.current = onCurrentChange;
    onEditStartRef.current = onEditStart;
    onSavedRef.current = onSaved;
    onAddedRef.current = onAdded;
    onDeletedRef.current = onDeleted;
    onRowClickRef.current = onRowClick;
    onRowDoubleClickRef.current = onRowDoubleClick;
    detailRef.current = detail;
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
      setCurrent: (id) => tableRef.current?.setCurrent(id) ?? false,
      getCurrent: () => tableRef.current?.getCurrent(),
      isCurrent: (id) => tableRef.current?.isCurrent(id) ?? false,
      openDetail: (id) => tableRef.current?.openDetail(id),
      closeDetail: (id) => tableRef.current?.closeDetail(id),
      toggleDetail: (id) => tableRef.current?.toggleDetail(id),
      isDetailOpen: (id) => tableRef.current?.isDetailOpen(id) ?? false,
      getData: (scope) => tableRef.current?.getData(scope) ?? [],
      getRow: (id) => tableRef.current?.getRow(id),
      getApi: () => tableRef.current?.getApi(),
      // Nothing to put it in yet: the `data` prop is the way in before that.
      insertRow: (rows) => tableRef.current?.insertRow(rows),
      updateRow: (row) => tableRef.current?.updateRow(row) ?? false,
      removeRow: (id) => tableRef.current?.removeRow(id) ?? false,
      getTotals: () => tableRef.current?.getTotals() ?? {},
      getOptions: (prop) => tableRef.current?.getOptions(prop),
    }),
    [],
  );

  return (
    <>
      <div ref={containerRef} />
      {[...details].map(([key, { element, content }]) => createPortal(content, element, key))}
    </>
  );
}
