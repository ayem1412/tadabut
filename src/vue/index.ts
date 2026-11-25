/**
 * The Vue component.
 *
 * @packageDocumentation
 * @module tadabut/vue
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { Tadabut } from 'tadabut/vue';
 * </script>
 *
 * <template>
 *   <Tadabut :data="employees" :columns="columns" row-id="id" @saved="onSaved" />
 * </template>
 * ```
 */

import type { Api } from 'datatables.net';
import {
  type ComputedRef,
  computed,
  defineComponent,
  type EmitsToProps,
  h,
  type InjectionKey,
  inject,
  onBeforeUnmount,
  onMounted,
  type PropType,
  type PublicProps,
  provide,
  type SetupContext,
  type SlotsType,
  shallowRef,
  Teleport,
  toRaw,
  type VNode,
  watch,
} from 'vue';

import {
  Tadabut as Core,
  type DefaultOptions,
  type SaveContext,
  type ServerFunction,
  type TadabutOptions,
} from '../index';

/** The defaults of the nearest `<TadabutDefaults>`. */
const defaultsKey: InjectionKey<ComputedRef<DefaultOptions>> = Symbol('tadabut-defaults');

/** The props of `<TadabutDefaults>`. */
export type TadabutDefaultsProps = {
  /** The options every `<Tadabut>` inside starts with. */
  readonly value: DefaultOptions;
};

/** What `<TadabutDefaults>` is, for TypeScript and your editor. */
export type TadabutDefaultsComponent = new () => {
  /** Its props. */
  $props: TadabutDefaultsProps & PublicProps;
  /** Its slot: your app, or the part of it that uses these defaults. */
  $slots: { default?: () => VNode[] };
};

/** `<TadabutDefaults>` before its types are written out. */
const defaultsComponent = defineComponent({
  name: 'TadabutDefaults',
  props: {
    /** The options every `<Tadabut>` inside starts with. */
    value: { type: Object as PropType<DefaultOptions>, required: true },
  },
  setup(props, { slots }) {
    const outer = inject(
      defaultsKey,
      computed(() => ({})),
    );

    provide(
      defaultsKey,
      computed(() => Core.extend(outer.value).extend(props.value).defaults),
    );

    return () => slots.default?.();
  },
});

/**
 * Shared options for every `<Tadabut>` inside, like `Tadabut.extend` without
 * Vue. A table's own props win, and the objects combine key by key. An inner
 * `<TadabutDefaults>` builds on the outer one. A new `value` object rebuilds
 * every table inside, so keep it in a constant.
 *
 * @example
 * <TadabutDefaults :value="appDefaults">
 *   <RouterView />
 * </TadabutDefaults>
 */
export const TadabutDefaults: TadabutDefaultsComponent =
  defaultsComponent as unknown as TadabutDefaultsComponent;

/**
 * What the template ref gets. No `setData` or `setEditable`: change the
 * `data` and `editable` props instead. Before the table is built, `getApi`
 * gives `undefined`.
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

/** The core options that are events in Vue, like `@saved`. */
type EventOptions =
  | 'onSaved'
  | 'onAdded'
  | 'onDeleted'
  | 'onSelect'
  | 'onCurrentChange'
  | 'onRowClick'
  | 'onRowDoubleClick';

/**
 * The core options, as props. The callbacks that give something back
 * (`onSave`, `onAdd`, `onDelete`, `confirmDelete`, `onEditStart`, `server`)
 * stay props, since an event can't return a value. The others are events.
 * `detail` is a slot.
 */
export type TadabutProps<Row extends object> = Omit<TadabutOptions<Row>, 'detail' | EventOptions>;

/** The events, with the same arguments as the matching `on…` option. */
export type TadabutEmits<Row extends object> = {
  /** A save worked and the row closed: the row as it is now, and the row before editing. */
  saved: (row: Row, context: SaveContext<Row>) => void;
  /** A new row joined the table, as saved. */
  added: (row: Row) => void;
  /** A row left the table after `onDelete`. */
  deleted: (row: Row) => void;
  /** The ticked rows changed, by a click or from code. */
  select: (rows: readonly Row[]) => void;
  /** The highlight moved. `null` when no row is highlighted anymore. */
  currentChange: (row: Row | null) => void;
  /** A row was clicked, with the same rules as `onRowClick`. */
  rowClick: (row: Row, event: MouseEvent) => void;
  /** A row was double-clicked, with the same rules as `onRowDoubleClick`. */
  rowDoubleClick: (row: Row, event: MouseEvent) => void;
};

/** The slots. */
export type TadabutSlots<Row extends object> = {
  /**
   * Adds a ▸ button at the start of each row. It opens a line under the row
   * with this slot: any template, so your components work inside, and they
   * can load their own data. It's drawn again after the row is saved. Needs
   * `rowId`.
   *
   * @example
   * <template #detail="{ row }"><OrderLines :order-id="row.id" /></template>
   */
  detail?: (props: { row: Row }) => VNode[];
};

/** Everything Vue's tools need to know about one `<Tadabut>`. */
export type TadabutContext<Row extends object> = {
  /** Its props, events included as `onSaved`… */
  props: TadabutProps<Row> & EmitsToProps<TadabutEmits<Row>> & PublicProps;
  /** What the template ref gets. */
  expose(exposed: TadabutHandle<Row>): void;
  /** Attributes that aren't props, passed to the wrapper. */
  attrs: Record<string, unknown>;
  /** Its slots. */
  slots: TadabutSlots<Row>;
  /** Its events. */
  emit: SetupContext<TadabutEmits<Row>>['emit'];
};

/**
 * What `<Tadabut>` is, for TypeScript and your editor: a generic component,
 * so `Row` comes from `data` or `columns`. The same shape `vue-tsc` gives a
 * `<script setup generic>` component, so Vue's tools read its props, events,
 * slots, and the template ref's methods ({@link TadabutHandle}).
 */
export type TadabutComponent = <Row extends object>(
  props: TadabutContext<Row>['props'],
  context?: Pick<TadabutContext<Row>, 'attrs' | 'emit' | 'slots'>,
  expose?: TadabutContext<Row>['expose'],
  setup?: Promise<TadabutContext<Row>>,
) => VNode & {
  /** Read by Vue's tools only: never set. */
  __ctx?: TadabutContext<Row>;
};

/** An open detail: where the slot goes, and for which row. */
type Detail<Row> = {
  /** The `<div>` the core put under the row. */
  readonly element: HTMLDivElement;
  /** The row, as the core gave it. */
  readonly row: Row;
};

/**
 * A prop written without a value, like `<Tadabut selection>`, comes as `''`.
 * The props are listed by name only (a generic component can't type them
 * one by one), so Vue doesn't turn that into `true` by itself.
 */
function flag<Value>(value: Value | ''): Value | true {
  return value === '' ? true : value;
}

/** Builds `<Tadabut>`: the core table, its watchers, and the methods for the ref. */
function setup<Row extends object>(
  props: TadabutProps<Row>,
  { attrs, emit, slots, expose }: SetupContext<TadabutEmits<Row>, SlotsType<TadabutSlots<Row>>>,
): () => VNode[] {
  const injected = inject(defaultsKey, null);
  // A class per defaults object, so a new one rebuilds the table, and nothing else does.
  const Table = computed(() => Core.extend(injected?.value ?? {}));
  /** The `<div>` the core builds the table in. */
  const container = shallowRef<HTMLDivElement>();
  /** The core table, while it exists. */
  let table: Core<Row> | undefined;
  /** The next key for an open detail. Never reused, so a reload gets a fresh one. */
  let nextKey = 0;
  /** The open details the slot is drawn into, by key. */
  const details = shallowRef<ReadonlyMap<number, Detail<Row>>>(new Map());
  /** Read once: the slot's presence isn't reactive. */
  const hasDetail = slots.detail !== undefined;

  /** The rows without Vue's proxies, which DataTables doesn't need. */
  const plainRows = (rows: readonly Row[]): Row[] => toRaw(rows).map((row) => toRaw(row));

  /** Destroys the table, if any, and builds it again from the current props. */
  const build = (): void => {
    table?.destroy();
    table = undefined;
    details.value = new Map();

    if (container.value === undefined) {
      return;
    }

    const { confirmDelete } = props;
    const hasServer = props.server !== undefined;

    table = new Table.value(container.value, {
      data: hasServer || props.data === undefined ? undefined : plainRows(props.data),
      // Always set here: removing `server` rebuilds.
      server: hasServer
        ? (request, context) => (props.server as ServerFunction<Row>)(request, context)
        : undefined,
      editable: flag(props.editable),
      autoAdd: flag(toRaw(props.autoAdd)),
      columns: toRaw(props.columns),
      rowId: props.rowId,
      editing: toRaw(props.editing),
      dataTables: toRaw(props.dataTables),
      texts: toRaw(props.texts),
      totalRows: props.totalRows,
      selection: flag(toRaw(props.selection)),
      currentRow: flag(props.currentRow),
      classNames: toRaw(props.classNames),
      icons: toRaw(props.icons),
      // Through `props`, so the latest function is called without a rebuild.
      onSave: (row, context) => props.onSave?.(row, context),
      onAdd: (row) => props.onAdd?.(row),
      onDelete: props.onDelete === undefined ? undefined : (row) => props.onDelete?.(row),
      confirmDelete:
        typeof confirmDelete === 'function'
          ? (row) => {
              const ask = props.confirmDelete;
              // Always a function here: switching to anything else rebuilds.
              return typeof ask === 'function' ? ask(row) : true;
            }
          : confirmDelete,
      onEditStart: (row) => props.onEditStart?.(row),
      onSaved: (row, context) => emit('saved', row, context),
      onAdded: (row) => emit('added', row),
      onDeleted: (row) => emit('deleted', row),
      onSelect: (rows) => emit('select', rows),
      onCurrentChange: (row) => emit('currentChange', row),
      onRowClick: (row, event) => emit('rowClick', row, event),
      onRowDoubleClick: (row, event) => emit('rowDoubleClick', row, event),
      // The core shows a <div>, and Vue draws the slot into it with a Teleport.
      detail: hasDetail
        ? (row, context) => {
            const key = nextKey++;
            const element = document.createElement('div');

            details.value = new Map(details.value).set(key, { element, row });

            // The core aborts the signal when the detail closes, reloads, or
            // the table goes away.
            context.signal.addEventListener(
              'abort',
              () => {
                const next = new Map(details.value);
                next.delete(key);
                details.value = next;
              },
              { once: true },
            );

            return element;
          }
        : undefined,
    });
  };

  onMounted(build);

  onBeforeUnmount(() => {
    table?.destroy();
    table = undefined;
  });

  // What rebuilds. Objects that are often written inline are compared as text.
  watch(
    [
      () => props.columns,
      () => props.rowId,
      () => props.dataTables,
      () => props.texts,
      () => props.totalRows,
      () => JSON.stringify(props.editing ?? {}),
      () => JSON.stringify(props.classNames ?? {}),
      () => JSON.stringify(props.icons ?? {}),
      () => JSON.stringify(props.selection),
      () => props.currentRow,
      () => props.onDelete !== undefined,
      () => props.server !== undefined,
      () =>
        props.confirmDelete === false
          ? 'never'
          : props.confirmDelete === undefined
            ? 'inline'
            : 'function',
      () => JSON.stringify(props.autoAdd),
      Table,
    ],
    build,
  );

  // One level deep: push, splice and replacing an item count, a field inside a row doesn't.
  watch(
    () => props.data,
    (rows) => {
      if (rows !== undefined && props.server === undefined) {
        table?.setData(plainRows(rows));
      }
    },
    { deep: 1 },
  );

  // Without a rebuild, so ticks, details and sorting stay.
  watch(
    () => props.editable,
    (editable) => table?.setEditable(flag(editable) ?? Table.value.defaults.editable ?? true),
  );

  const handle: TadabutHandle<Row> = {
    edit: (id) => table?.edit(id) ?? false,
    save: (id) => table?.save(id) ?? Promise.resolve(false),
    cancel: (id) => table?.cancel(id),
    delete: (id) => table?.delete(id) ?? Promise.resolve(false),
    add: (defaults) => table?.add(defaults) ?? false,
    isAdding: () => table?.isAdding() ?? false,
    saveNew: () => table?.saveNew() ?? Promise.resolve(false),
    cancelNew: () => table?.cancelNew(),
    isEditing: (id) => table?.isEditing(id) ?? false,
    getSelected: () => table?.getSelected() ?? [],
    isSelected: (id) => table?.isSelected(id) ?? false,
    select: (ids) => table?.select(ids),
    deselect: (ids) => table?.deselect(ids),
    clearSelection: () => table?.clearSelection(),
    setCurrent: (id) => table?.setCurrent(id) ?? false,
    getCurrent: () => table?.getCurrent(),
    isCurrent: (id) => table?.isCurrent(id) ?? false,
    openDetail: (id) => table?.openDetail(id),
    closeDetail: (id) => table?.closeDetail(id),
    toggleDetail: (id) => table?.toggleDetail(id),
    isDetailOpen: (id) => table?.isDetailOpen(id) ?? false,
    getData: (scope) => table?.getData(scope) ?? [],
    getRow: (id) => table?.getRow(id),
    getApi: () => table?.getApi(),
    // Nothing to put it in yet: the `data` prop is the way in before that.
    insertRow: (rows) => table?.insertRow(rows),
    updateRow: (row) => table?.updateRow(row) ?? false,
    removeRow: (id) => table?.removeRow(id) ?? false,
    getTotals: () => table?.getTotals() ?? {},
    getOptions: (prop) => table?.getOptions(prop),
    reload: () => table?.reload(),
  };

  expose(handle);

  return () => [
    // Vue can't pass `class`, `id`… by itself to more than one root.
    h('div', { ...attrs, ref: container }),
    ...[...details.value].map(([key, { element, row }]) =>
      h(Teleport, { to: element, key }, slots.detail?.({ row }) ?? []),
    ),
  ];
}

/**
 * New `data` updates the table in place, and so do `push`, `splice` and
 * replacing an item, since the array is watched one level deep. Changing a
 * field inside a row isn't seen: use `updateRow`. With `server`, call
 * `reload()` on the ref when something it reads changes.
 *
 * Changing `columns`, `rowId`, `dataTables`, `texts`, `totalRows`,
 * `selection`, `currentRow` or the values in `autoAdd` rebuilds the table
 * (and closes open rows and details, and clears the selection and the
 * highlight), so keep those in constants. `editing`, `classNames` and
 * `icons` can be written inline: they're compared by value. The callbacks
 * can change freely: the latest one is always called.
 *
 * Whether there's a `#detail` slot is read once, when the table is built.
 */
export const Tadabut: TadabutComponent = defineComponent({
  // biome-ignore lint/style/useVueMultiWordComponentNames: no HTML element will ever be called "Tadabut", and it's the name people import.
  name: 'Tadabut',
  // By name only: a generic component can't type them one by one.
  props: [
    'data',
    'server',
    'columns',
    'rowId',
    'editing',
    'editable',
    'autoAdd',
    'classNames',
    'icons',
    'dataTables',
    'texts',
    'totalRows',
    'selection',
    'currentRow',
    'onSave',
    'onAdd',
    'onDelete',
    'confirmDelete',
    'onEditStart',
  ],
  emits: ['saved', 'added', 'deleted', 'select', 'currentChange', 'rowClick', 'rowDoubleClick'],
  // The wrapper `<div>` gets them, in the render function.
  inheritAttrs: false,
  // The types are written out in `TadabutComponent`.
  setup: setup as never,
}) as unknown as TadabutComponent;
