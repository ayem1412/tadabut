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
  createContext,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
  Tadabut as Core,
  type DefaultOptions,
  type DetailContext,
  type ServerFunction,
  type TadabutOptions,
} from '../index';

/** The defaults of the nearest `<TadabutDefaults>`, or none. */
const DefaultsContext = createContext<DefaultOptions>({});

/** The props of `<TadabutDefaults>`. */
export type TadabutDefaultsProps = {
  /** The options every `<Tadabut>` inside starts with. Keep it stable: a new object rebuilds every table. */
  readonly value: DefaultOptions;
  /** Your app, or the part of it that uses these defaults. */
  readonly children?: ReactNode;
};

/**
 * Shared options for every `<Tadabut>` inside, like `Tadabut.extend` without
 * React. A table's own props win, and the objects combine key by key. An inner
 * `<TadabutDefaults>` builds on the outer one.
 *
 * @example
 * <TadabutDefaults value={appDefaults}>
 *   <App />
 * </TadabutDefaults>
 */
export function TadabutDefaults({ value, children }: TadabutDefaultsProps): ReactElement {
  const outer = useContext(DefaultsContext);
  const merged = useMemo(() => Core.extend(outer).extend(value).defaults, [outer, value]);

  return <DefaultsContext.Provider value={merged}>{children}</DefaultsContext.Provider>;
}

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
  | 'reload'
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
   * `getRow`, `getApi`, `insertRow`, `updateRow`, `removeRow`, `getTotals`,
   * `getOptions` and `reload`.
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
 * New `data` updates the table in place. With `server`, call `reload()` on
 * the ref when something it reads changes. Changing `columns`, `rowId`,
 * `dataTables`, `texts`, `totalRows`, `selection`, `currentRow` or the values
 * in `autoAdd` rebuilds it (and closes open rows and details, and clears the
 * selection and the highlight), so keep the objects stable with a constant or `useMemo`. `editing`, `selection`, `classNames`, `icons`,
 * `detail` and every `on…` callback (and `confirmDelete`) can be inline:
 * they're compared by value or read through a ref.
 */
export function Tadabut<Row extends object>({
  data,
  server,
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
  editable,
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
  const defaults = useContext(DefaultsContext);
  // A class per defaults object, so a new one rebuilds the table, and nothing else does.
  const Table = useMemo(() => Core.extend(defaults), [defaults]);
  /** The `<div>` the core builds the table in. */
  const containerRef = useRef<HTMLDivElement>(null);
  /** The core table. `null` before the first build and after unmount. */
  const tableRef = useRef<Core<Row>>(null);
  /** The latest rows, so a rebuild doesn't go back to the first ones. */
  const dataRef = useRef(data);
  /** The latest `autoAdd`. Its text is what rebuilds, so a Date in it stays a Date. */
  const autoAddRef = useRef(autoAdd);
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
  /** The latest `server`, so an inline function doesn't rebuild the table. */
  const serverRef = useRef(server);
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
  // `undefined` when not given, so the defaults' `selection` still counts.
  const selectionOn = selection === undefined ? undefined : Boolean(selection);
  const checkAll = typeof selection === 'object' ? selection.checkAll : undefined;
  // Only whether they're set changes the buttons, not which function it is.
  const hasDelete = onDelete !== undefined;
  /** Switching between `data` and `server` rebuilds; a new `server` function doesn't. */
  const hasServer = server !== undefined;
  const confirmWith =
    confirmDelete === false ? 'never' : confirmDelete === undefined ? 'inline' : 'function';
  const hasDetail = detail !== undefined;
  // As text, so a new object with the same values doesn't rebuild the table.
  const autoAddKey = autoAdd === undefined ? undefined : JSON.stringify(autoAdd);

  // A layout effect runs before every useEffect, so a rebuild in the same
  // render already sees the new functions and values.
  useLayoutEffect(() => {
    dataRef.current = data;
    editableRef.current = editable;
    autoAddRef.current = autoAdd;
    onSaveRef.current = onSave;
    onAddRef.current = onAdd;
    onDeleteRef.current = onDelete;
    serverRef.current = server;
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

    const table = new Table(container, {
      data: hasServer ? undefined : dataRef.current,
      // Always set here: removing `server` rebuilds.
      server: hasServer
        ? (request, context) => (serverRef.current as ServerFunction<Row>)(request, context)
        : undefined,
      editable: editableRef.current,
      // The key says whether it's on, the ref gives the values as they are.
      autoAdd: autoAddKey === undefined ? undefined : autoAddRef.current,
      columns,
      rowId,
      editing: { mode, button, doubleClick },
      dataTables,
      texts,
      totalRows,
      selection: selectionOn === undefined ? undefined : selectionOn && { checkAll },
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
    hasServer,
    confirmWith,
    hasDetail,
    autoAddKey,
    Table,
  ]);

  useEffect(() => {
    // With server, the table loads its own rows.
    if (data !== undefined && !hasServer) {
      tableRef.current?.setData(data);
    }
  }, [data, hasServer]);

  // Without a rebuild, so ticks, details and sorting stay.
  useEffect(() => {
    // Not given: what the table started with, from the defaults or `true`.
    tableRef.current?.setEditable(editable ?? Table.defaults.editable ?? true);
  }, [editable, Table]);

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
      reload: () => tableRef.current?.reload(),
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
