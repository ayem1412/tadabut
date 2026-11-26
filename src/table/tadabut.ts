import DataTable, { type Api, type ApiRowMethods } from 'datatables.net';
import type { Column } from '../columns/column';
import { toDataTables } from '../columns/to-datatables';
import { type EditableCell, EditSession } from '../editing/session';
import { addClasses, splitClasses } from '../editors/classes';
import type { SelectOption } from '../editors/select';
import { en } from '../texts/en';
import type { Texts } from '../texts/texts';
import { checkOptions } from './check-options';
import { CurrentRow } from './current-row';
import { type DefaultOptions, mergeOptions } from './defaults';
import { type Action, deleteQuestion, isButtonAction, saveCancelButtons } from './elements';
import { Listeners, type TadabutEventName, type TadabutListener } from './events';
import { NewRow } from './new-row';
import type {
  ButtonIcons,
  DataTablesSettings,
  EditingOptions,
  TableClassNames,
  TadabutOptions,
} from './options';
import { RowLines } from './row-lines';
import type { RowScope, TotalScope } from './scope';
import { Selection } from './selection';
import { ServerSource } from './server';
import { footerFor, formatTotal, rowsFor, totalText, totalValue } from './totals';

/**
 * A DataTables table with row editing.
 *
 * @typeParam Row - Usually inferred from `data`.
 *
 * @example
 * const table = new Tadabut(container, {
 *   data: [{ id: 1, name: 'Amina' }],
 *   rowId: 'id',
 *   columns: [
 *     { title: 'ID', prop: 'id' },
 *     { title: 'Name', prop: 'name' },
 *   ],
 * });
 */
export class Tadabut<Row extends object> {
  /** The options every table of this class starts with. Set with `extend`, never changed after. */
  public static readonly defaults: DefaultOptions = Object.freeze({});

  /**
   * A new table class that starts with these options. Pages can override any
   * of them, and `AppTable.extend({…})` builds on `AppTable`'s.
   *
   * @example
   * export const AppTable = Tadabut.extend({ texts: fr, classNames: bootstrapClasses });
   *
   * const table = new AppTable(container, { data, columns, rowId: 'id' });
   */
  public static extend(defaults: DefaultOptions): TadabutClass {
    // biome-ignore lint/complexity/noThisInStatic: `this` is the class extend is called on, so AppTable.extend builds on AppTable's defaults. Tadabut.defaults would forget them.
    const merged = Object.freeze(mergeOptions(this.defaults, defaults));

    return class<Row extends object> extends Tadabut<Row> {
      public static override readonly defaults: DefaultOptions = merged;
    };
  }

  /** The DataTables instance. */
  private readonly dataTable: Api<Row>;
  /** The `<table>` Tadabut created. */
  private readonly tableEl: HTMLTableElement;
  /** The field that identifies a row. */
  private readonly rowId?: keyof Row & string;
  /** The user's columns, without the actions column. */
  private readonly columns: readonly Column<Row>[];
  /** `editing` with its defaults filled in. */
  private readonly editing: Required<EditingOptions>;
  /** Whether rows can be edited, added and deleted right now. */
  private editable: boolean;
  /** The user's classes, or `{}`. */
  private readonly classNames: TableClassNames;
  /** The user's button icons, or `{}`. */
  private readonly icons: ButtonIcons;
  /** The user's texts over English. */
  private readonly texts: Texts;
  /** The user's save callback. */
  private readonly onSave: TadabutOptions<Row>['onSave'];
  /** The user's add callback. */
  private readonly onAdd: TadabutOptions<Row>['onAdd'];
  /** The user's delete callback. */
  private readonly onDelete: TadabutOptions<Row>['onDelete'];
  /** What the Delete button does before deleting. */
  private readonly confirmDelete: TadabutOptions<Row>['confirmDelete'];
  /** Whether the actions column exists. */
  private readonly hasActions: boolean;
  /** Whether any column has an editor. */
  private readonly hasEditor: boolean;
  /** Open rows, by row id. */
  private readonly sessions: Map<string | number, EditSession<Row>> = new Map();
  /** Rows waiting for `onDelete`, by row id. The value is a token for the call that started it. */
  private readonly deleting: Map<string | number, object> = new Map();
  /** The row `add()` opened, if any. */
  private newRow?: NewRow<Row>;
  /** Whether any column has a `total`, so the table has a footer. */
  private readonly hasTotals: boolean;
  /** Which rows the totals count, with its default filled in. */
  private readonly totalRows: TotalScope;
  /** How many columns Tadabut adds before yours: the checkboxes and the ▸ button. */
  private readonly offset: number;
  /** The ticked rows. Only with `selection`. */
  private readonly selection?: Selection<Row>;
  /** The highlighted row. Only with `currentRow`. */
  private readonly currentRow?: CurrentRow<Row>;
  /** Asked before a row opens. */
  private readonly onEditStart: TadabutOptions<Row>['onEditStart'];
  /** The lines under each row: details and errors. */
  private readonly rowLines: RowLines<Row>;
  /** The last options each select loaded, by field. */
  private readonly loadedOptions = new Map<string, readonly SelectOption<unknown>[]>();
  /** The new row's starting values with `autoAdd`, or `undefined` without it. */
  private readonly autoAdd?: Partial<Row>;
  /** Who listens to what: the `on…` options first, then `on()`. */
  private readonly listeners = new Listeners<Row>();
  /** Loads the rows a page at a time. Only with the `server` option. */
  private readonly server?: ServerSource<Row>;
  /** After an add with `server`: the next new row takes the cursor once the page reloads. */
  private focusNewRow = false;
  /** The line above the table when loading the rows failed. */
  private loadError?: HTMLDivElement;
  /** Fields the server sent no total for, so the console only warns once each. */
  private readonly warnedTotals = new Set<string>();
  /** Whether `autoAdd` opened the new row, rather than `add()`. */
  private newRowIsAuto = false;
  /** Whether Edit closed the auto row in `'single'` mode, so it comes back once that row closes. */
  private autoMadeWay = false;

  /**
   * Builds the table inside `container`, which should be empty.
   *
   * @throws If a column has an `editor` and there's no `rowId`.
   * @throws If `onDelete` is set and there's no `rowId`.
   * @throws If `selection` is on and there's no `rowId`.
   * @throws If `currentRow` is on and there's no `rowId`.
   * @throws If `detail` is set and there's no `rowId`.
   * @throws If `autoAdd` is on and no column has an `editor`.
   * @throws If `totalRows` is `'selected'` without `selection`.
   * @throws If a hidden column (`visible: false`) has an `editor`.
   * @throws If a select's `labelProp` is its own column.
   * @throws If a money editor's `separator` and `point` are the same.
   * @throws If a date editor's `min` or `max` isn't a real date in its `format`.
   * @throws If a time editor's `min` or `max` isn't a real time.
   * @throws If a datetime editor's `min` or `max` isn't a real date and time in its `format`.
   * @throws If both `data` and `server` are given.
   */
  public constructor(container: HTMLElement, given: TadabutOptions<Row>) {
    // new.target: the class the page used, so AppTable's defaults are read here.
    // Before checkOptions, so it checks what the table really gets.
    const options = mergeOptions((new.target as typeof Tadabut).defaults, given);

    checkOptions(options);

    this.hasEditor = options.columns.some((column) => column.editor !== undefined);
    this.rowId = options.rowId;
    this.columns = options.columns;
    this.editing = {
      mode: options.editing?.mode ?? 'single',
      button: options.editing?.button ?? true,
      doubleClick: options.editing?.doubleClick ?? false,
    };

    this.editable = options.editable ?? true;

    const actions: Action[] = [];

    if (this.hasEditor && this.editing.button) {
      actions.push('edit');
    }

    if (options.onDelete !== undefined) {
      actions.push('delete');
    }

    this.hasActions = actions.length > 0;
    this.onSave = options.onSave;
    this.onAdd = options.onAdd;
    this.onDelete = options.onDelete;
    this.onEditStart = options.onEditStart;

    if (options.onSaved !== undefined) {
      this.listeners.on('saved', options.onSaved);
    }

    if (options.onAdded !== undefined) {
      this.listeners.on('added', options.onAdded);
    }

    if (options.onDeleted !== undefined) {
      this.listeners.on('deleted', options.onDeleted);
    }

    if (options.onSelect !== undefined) {
      this.listeners.on('select', options.onSelect);
    }

    if (options.onCurrentChange !== undefined) {
      this.listeners.on('currentChange', options.onCurrentChange);
    }

    if (options.onRowClick !== undefined) {
      this.listeners.on('rowClick', options.onRowClick);
    }

    if (options.onRowDoubleClick !== undefined) {
      this.listeners.on('rowDoubleClick', options.onRowDoubleClick);
    }

    this.confirmDelete = options.confirmDelete;
    this.classNames = options.classNames ?? {};
    this.icons = options.icons ?? {};
    this.texts = { ...en, ...options.texts };
    this.hasTotals = options.columns.some((column) => column.total !== undefined);
    this.totalRows = options.totalRows ?? 'searched';
    this.offset = (options.selection ? 1 : 0) + (options.detail !== undefined ? 1 : 0);
    this.autoAdd =
      options.autoAdd === true
        ? {}
        : typeof options.autoAdd === 'object'
          ? options.autoAdd
          : undefined;

    this.tableEl = document.createElement('table');
    addClasses(this.tableEl, [], this.classNames.table);
    container.appendChild(this.tableEl);

    // Before DataTables starts, or it won't manage the footer.
    if (this.hasTotals) {
      this.tableEl.append(footerFor(this.offset + this.columns.length + (this.hasActions ? 1 : 0)));
    }

    // The callbacks only run once a reply came, after an await: by then the
    // constructor has finished, so rowLines and the rest exist.
    if (options.server !== undefined) {
      this.server = new ServerSource({
        server: options.server,
        columns: this.columns,
        offset: this.offset,
        onRows: () => this.forgetRows(),
        onError: (message) => this.showLoadError(message ?? this.texts.rowsFailed),
        onLoaded: () => this.hideLoadError(),
      });
    }

    this.dataTable = new DataTable(this.tableEl, {
      // Before the spread, so a page can turn it off. Without it, nothing shows while waiting.
      ...(this.server !== undefined && { processing: true }),
      ...options.dataTables,
      ...(this.offset > 0 && { order: shiftOrder(options.dataTables?.order, this.offset) }),
      ...(this.server === undefined
        ? { data: [...(options.data ?? [])] }
        : { serverSide: true, ajax: this.server.ajax }),
      columns: toDataTables(options.columns, actions, this.classNames, this.texts, this.icons, {
        selection: Boolean(options.selection),
        detail: options.detail !== undefined,
      }),
    });

    if (!this.editable) {
      this.applyEditable();
    }

    this.rowLines = new RowLines({
      dataTable: this.dataTable,
      rowId: this.rowId,
      detail: options.detail,
      texts: this.texts,
      icons: this.icons,
    });

    // Redrawing a row (save, cancel, paging) brings back a closed ▸.
    if (options.detail !== undefined) {
      this.dataTable.on('draw', () => this.rowLines.sync());
    }

    if (options.selection) {
      this.selection = new Selection({
        dataTable: this.dataTable,
        rowId: this.rowId as keyof Row & string,
        server: this.server !== undefined,
        scope:
          this.server !== undefined
            ? 'page'
            : typeof options.selection === 'object'
              ? (options.selection.checkAll ?? 'searched')
              : 'searched',
        onSelect: (rows) => {
          // Ticking doesn't redraw, so the totals wouldn't follow by themselves.
          if (this.hasTotals && this.totalRows === 'selected') {
            this.updateTotals();
          }

          this.listeners.emit('select', rows);
        },
      });
      this.dataTable.on('draw', () => this.selection?.sync());
      this.selection.sync();
    }

    if (options.currentRow) {
      this.currentRow = new CurrentRow({
        dataTable: this.dataTable,
        rowId: this.rowId as keyof Row & string,
        classes: splitClasses(this.classNames.current),
        onChange: (row) => this.listeners.emit('currentChange', row),
      });
      this.dataTable.on('draw', () => this.currentRow?.sync());
    }

    // The first draw already happened inside `new DataTable`. Not with server:
    // no reply yet, so there are no totals to show.
    if (this.hasTotals) {
      this.dataTable.on('draw', this.updateTotals);

      if (this.server === undefined) {
        this.updateTotals();
      }
    }

    if (this.hasActions || options.detail !== undefined) {
      this.tableEl.addEventListener('click', this.onClick);
    }

    if (this.hasEditor) {
      this.tableEl.addEventListener('keydown', this.onKeyDown);
    }

    this.tableEl.addEventListener('click', this.onRowEvent);
    this.tableEl.addEventListener('dblclick', this.onRowEvent);

    // Last, so the listeners above have synced. With server there are no
    // rows yet: the first reply opens the auto row.
    if (this.server !== undefined) {
      this.dataTable.on('draw', this.afterServerDraw);
    } else {
      this.autoOpen();
    }
  }

  /**
   * Replaces all rows. Sorting, search and the page are kept.
   *
   * Open rows, and the new row, are closed first, and their unsaved changes
   * are lost. Open details close too.
   *
   * @throws With `server`: use `reload()`.
   */
  public setData(rows: readonly Row[]): void {
    this.assertClientMode('setData');
    this.forgetRows();

    this.dataTable
      .clear()
      .rows.add([...rows])
      .draw(false);

    this.selection?.prune();
    this.currentRow?.prune();

    this.autoOpen();
  }

  /**
   * Asks the server for the page again, keeping the page, sorting and
   * search. For when something outside the table changed, like a filter.
   * Open rows close, like when the page changes.
   *
   * @throws Without `server`: use `setData()`.
   *
   * @example
   * yearSelect.addEventListener('change', () => table.reload());
   */
  public reload(): void {
    if (this.server === undefined) {
      throw new Error('Tadabut: reload() is for server. Use setData() to change the rows.');
    }

    this.dataTable.draw(false);
  }

  /**
   * Every row, in the order shown. `scope` works like `totalRows`: `'all'`
   * (default), `'searched'` or `'page'`. They're copies, so changing them
   * changes nothing: use `updateRow` for that.
   *
   * With `server`, only the rows of the page, whatever the `scope`.
   *
   * @example
   * table.getData('searched'); // the rows that match the search
   */
  public getData(scope: RowScope = 'all'): Row[] {
    return this.dataTable
      .rows(rowsFor(scope))
      .data()
      .toArray()
      .map((row) => ({ ...row }));
  }

  /**
   * The row with this id, as a copy, or `undefined`. It's the saved row:
   * while a row is edited, what's typed isn't in it until Save. With
   * `server`, only rows on the page are found.
   */
  public getRow(id: string | number): Row | undefined {
    const row = this.findRow(id);

    return row === undefined ? undefined : { ...row.data() };
  }

  /**
   * The DataTables API, for anything Tadabut doesn't do itself.
   *
   * Careful: rows added or removed through it skip Tadabut, so the
   * selection, details and open rows won't know. Use `insertRow`,
   * `updateRow`, `removeRow` and `setData` for that.
   *
   * @example
   * table.getApi().order([2, 'desc']).draw();
   */
  public getApi(): Api<Row> {
    return this.dataTable;
  }

  /**
   * Puts one row or many in the table, without `onAdd` or the new-row form,
   * and `onAdded` doesn't fire. They go where the sorting puts them, and the
   * table stays on the page it's on. Either every row goes in, or none.
   *
   * @throws If there's no `rowId`, a row has no `rowId` value, or its id is
   *   already in the table (or twice in `rows`).
   * @throws With `server`: use `reload()`.
   *
   * @example
   * table.insertRow(rowFromServer);
   */
  public insertRow(rows: Row | readonly Row[]): void {
    this.assertClientMode('insertRow');

    const rowId = this.rowId;

    if (rowId === undefined) {
      throw new Error('Tadabut: rowId is required with insertRow.');
    }

    // `Array.isArray` doesn't narrow readonly arrays, hence the cast.
    const list = (Array.isArray(rows) ? rows : [rows]) as readonly Row[];
    const seen = new Set<string | number>();

    // Every row is checked before any goes in.
    for (const row of list) {
      const id = row[rowId];

      if (typeof id !== 'string' && typeof id !== 'number') {
        throw new Error(`Tadabut: a row given to insertRow has no "${rowId}".`);
      }

      if (seen.has(id) || this.findRow(id) !== undefined) {
        throw new Error(`Tadabut: insertRow got the id ${id}, which is already in the table.`);
      }

      seen.add(id);
    }

    this.dataTable.rows.add(list.map((row) => ({ ...row }))).draw(false);
  }

  /**
   * Replaces the row with the same id, without `onSave`, and `onSaved` doesn't
   * fire. An open detail reloads.
   *
   * @returns `false` if no row has this id, or it's being edited or deleted.
   *
   * @example
   * table.updateRow({ ...table.getRow(1), name: 'Nadia' });
   */
  public updateRow(row: Row): boolean {
    if (this.rowId === undefined) {
      return false;
    }

    const id = row[this.rowId] as string | number;
    const found = this.findRow(id);

    // Changing a row under the user's fingers would lose what they typed.
    if (found === undefined || this.sessions.has(id) || this.deleting.has(id)) {
      return false;
    }

    this.redrawRow(id, row);
    this.rowLines.reload(id);

    return true;
  }

  /**
   * Takes a row out of the table, without `onDelete` and without asking, and
   * `onDeleted` doesn't fire. Its detail closes, and it leaves the selection.
   *
   * @returns `false` if no row has this id, or it's being edited or deleted.
   * @throws With `server`: use `reload()`.
   */
  public removeRow(id: string | number): boolean {
    this.assertClientMode('removeRow');

    const found = this.findRow(id);

    if (found === undefined || this.sessions.has(id) || this.deleting.has(id)) {
      return false;
    }

    found.remove().draw(false);
    this.rowLines.prune();
    this.selection?.prune();
    this.currentRow?.prune();

    return true;
  }

  /**
   * The footer's totals, by field: numbers for built-in totals (not
   * formatted, rounded like the footer), or your function's text. They count
   * the same rows as the footer. If two columns show the same field with a
   * total each, the last one wins.
   *
   * With `server`, the totals it sent, except with `totalRows: 'selected'`.
   *
   * @example
   * table.getTotals().salary; // 176651.5
   */
  public getTotals(): Partial<Record<keyof Row & string, number | string>> {
    if (this.server !== undefined && this.totalRows !== 'selected') {
      const totals: Partial<Record<keyof Row & string, number | string>> = {};

      for (const column of this.columns) {
        const value = this.server.totals[column.prop];

        if (column.total !== undefined && value !== undefined) {
          totals[column.prop] = value;
        }
      }

      return totals;
    }

    const rows = this.countedRows();
    const totals: Partial<Record<keyof Row & string, number | string>> = {};

    for (const column of this.columns) {
      const value = totalValue(column, rows);

      if (value !== undefined) {
        totals[column.prop] = value;
      }
    }

    return totals;
  }

  /**
   * A select's options. With a fixed list, that list. With an `options`
   * function, the list it last loaded in an open row, or `undefined` before
   * any row was opened. `undefined` for a column that isn't a select.
   *
   * @example
   * table.getOptions('countryId'); // [{ value: 1, label: 'Morocco' }, …]
   */
  public getOptions<Key extends keyof Row & string>(
    prop: Key,
  ): readonly SelectOption<NonNullable<Row[Key]>>[] | undefined {
    const editor = this.columns.find((column) => column.prop === prop)?.editor;

    if (editor?.type !== 'select') {
      return undefined;
    }

    const options =
      typeof editor.options === 'function' ? this.loadedOptions.get(prop) : editor.options;

    // `Column<Row>` loses the exact value type of each field here.
    return options as readonly SelectOption<NonNullable<Row[Key]>>[] | undefined;
  }

  /**
   * Opens a row for editing.
   *
   * @param id The value of the row's `rowId` field.
   * @returns `false` if editing is off, the row doesn't exist, is already
   *   open, another row or the new row from `add()` is open in `'single'`
   *   mode, nothing is editable, the row is being deleted, it's on a page that
   *   hasn't been displayed yet, or `onEditStart` returned `false`.
   */
  public edit(id: string | number): boolean {
    // With `autoAdd` in 'single' mode, the auto row would block every Edit.
    const autoMakesWay =
      this.editing.mode === 'single' &&
      this.sessions.size === 0 &&
      this.newRowIsAuto &&
      this.newRow?.saving === false;

    if (
      !this.editable ||
      !this.hasEditor ||
      this.sessions.has(id) ||
      (this.editing.mode === 'single' &&
        (this.sessions.size > 0 || (this.newRow !== undefined && !autoMakesWay))) ||
      this.deleting.has(id)
    ) {
      return false;
    }

    const row = this.findRow(id);

    // With deferred rendering, rows on pages never shown have no cells yet.
    if (row === undefined || row.node() === null) {
      return false;
    }

    if (this.onEditStart?.(row.data()) === false) {
      return false;
    }

    // Only now, so a refused Edit keeps the auto row and what was typed in it.
    if (autoMakesWay) {
      this.cancelNew();
      this.autoMadeWay = true;
    }

    const rowIndex = row.index();
    const cells: EditableCell<Row>[] = [];

    this.columns.forEach((column, columnIndex) => {
      if (column.editor !== undefined) {
        const cell = this.dataTable.cell(rowIndex, this.dtIndex(columnIndex)).node();
        cells.push({ column, cell: cell as HTMLTableCellElement });
      }
    });

    this.sessions.set(id, new EditSession(row.data(), cells, this.texts, this.rememberOptions));
    row.node()?.classList.add('tdb-row-editing');

    // Redrawing the row on save/cancel brings Edit and Delete back.
    if (this.hasActions) {
      this.actionsCell(row).replaceChildren(
        ...saveCancelButtons(this.texts, this.classNames, this.icons),
      );
    }

    return true;
  }

  /**
   * Opens an empty row at the top of the table, for a new row. `defaults` are
   * its starting values. The row is only added once Save works.
   *
   * @returns `false` if editing is off, no column has an editor, a new row is
   *   already open, or a row is being edited in `'single'` mode.
   *
   * @example
   * table.add({ country: 'MA' });
   */
  public add(defaults: Partial<Row> = {}): boolean {
    return this.openNew(defaults, true);
  }

  /** Opens the new row for `autoAdd`. Does nothing without it, or when `add()` would refuse. */
  private autoOpen(focus = false): void {
    if (this.autoAdd === undefined) {
      return;
    }

    // A copy, so the user's object is never touched.
    if (this.openNew({ ...this.autoAdd }, focus)) {
      this.newRowIsAuto = true;
    }
  }

  /** What `add` does, with the cursor moving only when `focus` is on. */
  private openNew(defaults: Partial<Row>, focus: boolean): boolean {
    if (
      !this.editable ||
      !this.hasEditor ||
      this.newRow !== undefined ||
      (this.editing.mode === 'single' && this.sessions.size > 0)
    ) {
      return false;
    }

    const newRow = new NewRow(defaults, {
      columns: this.columns,
      isVisible: (index) => this.dataTable.column(this.dtIndex(index)).visible(),
      withButtons: this.hasActions,
      texts: this.texts,
      classNames: this.classNames,
      icons: this.icons,
      leadingCells: this.offset,
      onOptions: this.rememberOptions,
    });

    this.tableEl.insertBefore(newRow.body, this.dataTable.table().body());

    if (focus) {
      newRow.focus();
    }

    this.newRow = newRow;
    // add() is the normal case: autoOpen sets it back right after.
    this.newRowIsAuto = false;

    return true;
  }

  /** Whether a new row is open. */
  public isAdding(): boolean {
    return this.newRow !== undefined;
  }

  /**
   * The selected rows, in the order they were added. Rows the search hides,
   * or on other pages, are in it too. Always `[]` without `selection`.
   */
  public getSelected(): Row[] {
    return this.selection?.selected() ?? [];
  }

  /** Whether a row is selected. Always `false` without `selection`. */
  public isSelected(id: string | number): boolean {
    return this.selection?.has(id) ?? false;
  }

  /**
   * Selects rows by id. Ids not in the table are skipped. Does nothing
   * without `selection`.
   *
   * @example
   * table.select([1, 2]);
   */
  public select(ids: readonly (string | number)[]): void {
    this.selection?.set(ids, true);
  }

  /** Unselects rows by id. Does nothing without `selection`. */
  public deselect(ids: readonly (string | number)[]): void {
    this.selection?.set(ids, false);
  }

  /** Unselects every row. Does nothing without `selection`. */
  public clearSelection(): void {
    this.selection?.clear();
  }

  /**
   * Highlights a row, like clicking it, or removes the highlight with `null`.
   * Unlike a click, it never takes the highlight off the row it's given.
   *
   * @returns `false` if no row has this id, or without `currentRow`.
   */
  public setCurrent(id: string | number | null): boolean {
    return this.currentRow?.set(id) ?? false;
  }

  /** The highlighted row, as a copy, or `undefined`. Always `undefined` without `currentRow`. */
  public getCurrent(): Row | undefined {
    const row = this.currentRow?.get();

    return row === undefined ? undefined : { ...row };
  }

  /** Whether a row is the highlighted one. Always `false` without `currentRow`. */
  public isCurrent(id: string | number): boolean {
    return this.currentRow?.has(id) ?? false;
  }

  /**
   * Opens a row's detail under it. "Loading…" shows until `detail` returns.
   * Does nothing without `detail`, if it's open already, or if the row
   * isn't in the table.
   *
   * @example
   * onRowClick: (row) => table.toggleDetail(row.id)
   */
  public openDetail(id: string | number): void {
    this.rowLines.open(id);
  }

  /** Closes a row's detail, and stops its load if it's still running. Does nothing without `detail`. */
  public closeDetail(id: string | number): void {
    this.rowLines.close(id);
  }

  /** Opens a closed detail, closes an open one, like the ▸ button. Does nothing without `detail`. */
  public toggleDetail(id: string | number): void {
    this.rowLines.toggle(id);
  }

  /** Whether a row's detail is open, or loading. Always `false` without `detail`. */
  public isDetailOpen(id: string | number): boolean {
    return this.rowLines.isOpen(id);
  }

  /**
   * Closes the new row and throws it away. Does nothing if there's none, or
   * while it's saving.
   */
  public cancelNew(): void {
    const newRow = this.newRow;

    if (newRow === undefined || newRow.saving) {
      return;
    }

    newRow.destroy();
    this.newRow = undefined;
  }

  /** Whether rows can be edited, added and deleted right now. */
  public isEditable(): boolean {
    return this.editable;
  }

  /**
   * Validates the new row, then calls `onAdd`. On success the row joins the
   * table, and the table shows the page it landed on. With `server`, the
   * page reloads instead, since the server decides where the row goes.
   *
   * While `onAdd` runs the row is locked. If it throws, the row stays open
   * and the error message is shown under it.
   *
   * @returns `true` once the row is added. `false` if there's no new row, a
   *   field is invalid, it's already saving, or `onAdd` threw.
   * @throws If the saved row has no `rowId` value.
   */
  public async saveNew(): Promise<boolean> {
    const newRow = this.newRow;

    if (newRow === undefined || newRow.saving) {
      return false;
    }

    if (!newRow.validate()) {
      return false;
    }

    const row = newRow.getRow();
    newRow.setSaving(true);

    let saved = row;

    try {
      const result = await this.onAdd?.(row);

      if (result !== undefined) {
        saved = result;
      }
    } catch (error) {
      if (this.newRow !== newRow) {
        return false;
      }

      newRow.setSaving(false);

      // Editing was turned off while it saved: no Save or Cancel to come back to.
      if (!this.editable) {
        this.cancelNew();
        return false;
      }

      newRow.showError(error instanceof Error ? error.message : this.texts.addFailed);
      return false;
    }

    // setData or destroy may have run while we were waiting.
    if (this.newRow !== newRow) {
      return false;
    }

    const id = this.rowId === undefined ? undefined : saved[this.rowId];

    // The developer's mistake, not the user's, so it goes to the console.
    if (typeof id !== 'string' && typeof id !== 'number') {
      newRow.setSaving(false);

      throw new Error(
        `Tadabut: the added row has no "${String(this.rowId)}". Return it from onAdd.`,
      );
    }

    newRow.destroy();
    this.newRow = undefined;

    // The server decides where the row goes, so the page reloads. The reply opens the next new row.
    if (this.server !== undefined) {
      this.focusNewRow = true;
      this.dataTable.draw(false);
      this.listeners.emit('added', { ...saved });

      return true;
    }

    const added = this.dataTable.row.add({ ...saved });
    this.dataTable.draw(false);

    // Its place among the rows as shown (sorted and searched) gives its page.
    const position = this.dataTable
      .rows({ order: 'applied', search: 'applied' })
      .indexes()
      .toArray()
      .indexOf(added.index());

    const length = this.dataTable.page.len();

    // -1: hidden by the search, or "Show all".
    if (position >= 0 && length > 0) {
      this.dataTable.page(Math.floor(position / length)).draw(false);
    }

    // Before onAdded: if it throws, the next row is open anyway.
    this.autoOpen(true);
    this.listeners.emit('added', added.data());

    return true;
  }

  /**
   * Closes a row and throws away its changes. Does nothing if the row isn't
   * open, or while it's saving.
   */
  public cancel(id: string | number): void {
    const session = this.sessions.get(id);

    if (session === undefined) {
      return;
    }

    if (session.saving) {
      return;
    }

    session.destroy();
    this.sessions.delete(id);

    this.rowLines.clearError(id);
    this.findRow(id)?.node()?.classList.remove('tdb-row-editing');

    this.redrawRow(id);
    this.giveBackAutoRow();
  }

  /** Whether a row is open for editing. */
  public isEditing(id: string | number): boolean {
    return this.sessions.has(id);
  }

  /**
   * Validates the open row, then calls `onSave`.
   *
   * Invalid fields show their errors and `onSave` isn't called. While
   * `onSave` runs the row is locked. If it throws, the row stays open and
   * the error message is shown under it. The table only changes on success.
   *
   * @returns `true` once the row is saved and closed.
   * @throws If `onSave` returns a row with a different `rowId` value.
   */
  public async save(id: string | number): Promise<boolean> {
    const session = this.sessions.get(id);

    if (session === undefined || session.saving) {
      return false;
    }

    session.clearErrors();
    this.rowLines.clearError(id);

    const errors = session.validate();
    const [firstInvalid] = errors.keys();

    if (firstInvalid !== undefined) {
      session.showErrors(errors);
      session.focus(firstInvalid);
      return false;
    }

    const row = session.getRow();
    this.setSaving(id, true);

    let saved = row;

    try {
      const result = await this.onSave?.(row, {
        previous: session.originalData,
      });

      if (result !== undefined) {
        saved = result;
      }
    } catch (error) {
      if (this.sessions.get(id) !== session) {
        return false;
      }

      this.setSaving(id, false);

      // Editing was turned off while it saved: its Save and Cancel are hidden now.
      if (!this.editable) {
        this.cancel(id);
      }

      this.rowLines.showError(id, error instanceof Error ? error.message : this.texts.saveFailed);
      return false;
    }

    // setData or destroy may have run while we were waiting.
    if (this.sessions.get(id) !== session) {
      return false;
    }

    // The developer's mistake, not the user's, so it goes to the console. The
    // selection, details and highlight all follow the id, so it can't change here.
    if (this.rowId !== undefined && saved[this.rowId] !== id) {
      this.setSaving(id, false);

      throw new Error(
        `Tadabut: onSave returned a row with a different "${this.rowId}". Keep the same id.`,
      );
    }

    session.destroy();
    this.sessions.delete(id);

    this.redrawRow(id, saved);
    this.findRow(id)?.node()?.classList.remove('tdb-row-editing');
    this.setSaving(id, false);

    this.rowLines.reload(id);
    this.giveBackAutoRow();
    this.listeners.emit('saved', saved, { previous: session.originalData });

    return true;
  }

  /**
   * Calls `onDelete`, then removes the row. Never asks first: only the
   * Delete button does. With `server`, the page reloads instead.
   *
   * While `onDelete` runs the row is locked. If it throws, the row stays and
   * the error message is shown under it.
   *
   * @returns `true` once the row is removed. `false` if editing is off, the
   *   row doesn't exist, is open for editing, is already being deleted, or
   *   `onDelete` threw.
   */
  public async delete(id: string | number): Promise<boolean> {
    const row = this.findRow(id);

    if (!this.editable || row === undefined || this.sessions.has(id) || this.deleting.has(id)) {
      return false;
    }

    const data = row.data();

    this.rowLines.clearError(id);

    const token = {};
    this.deleting.set(id, token);

    this.setSaving(id, true);

    try {
      await this.onDelete?.(data);
    } catch (error) {
      // setData or destroy may have run while we were waiting, and a new delete of
      // the same row may have started. Only this call's token means it's still ours.
      if (this.deleting.get(id) !== token) {
        return false;
      }

      this.deleting.delete(id);
      this.setSaving(id, false);
      this.keepRow(id);
      this.rowLines.showError(id, error instanceof Error ? error.message : this.texts.deleteFailed);

      return false;
    }

    if (this.deleting.get(id) !== token) {
      return false;
    }

    this.deleting.delete(id);

    // The next row of the next page moves up, so the server has to send the page again.
    if (this.server !== undefined) {
      this.selection?.forget(id);
      this.dataTable.draw(false);
      this.listeners.emit('deleted', data);

      return true;
    }

    this.findRow(id)?.remove().draw(false);

    this.rowLines.prune();

    this.selection?.prune();
    this.currentRow?.prune();

    this.listeners.emit('deleted', data);

    return true;
  }

  /**
   * Turns editing on or off. Off cancels open rows and the new row, and their
   * unsaved changes are lost. A row that is saving finishes first, and is
   * cancelled if its save fails. The buttons column hides while off.
   *
   * @example
   * table.setEditable(user.canEdit);
   */
  public setEditable(editable: boolean): void {
    if (editable === this.editable) {
      return;
    }

    this.editable = editable;

    if (!editable) {
      for (const id of [...this.sessions.keys()]) {
        this.cancel(id);
      }

      this.cancelNew();
      this.forgetDeleteQuestions();
    }

    this.applyEditable();

    if (editable) {
      this.autoOpen();
    }
  }

  /**
   * Listens to an event, after the matching `on…` option and the listeners
   * added before. A listener that throws doesn't stop the others: its error
   * shows in the console.
   *
   * @returns A function that stops listening.
   *
   * @example
   * const stop = table.on('saved', (row, { previous }) => console.log(previous.name, '→', row.name));
   * stop();
   */
  public on<Name extends TadabutEventName>(
    name: Name,
    listener: TadabutListener<Row, Name>,
  ): () => void {
    return this.listeners.on(name, listener);
  }

  /** Stops a listener added with `on`. It must be the same function. */
  public off<Name extends TadabutEventName>(
    name: Name,
    listener: TadabutListener<Row, Name>,
  ): void {
    this.listeners.off(name, listener);
  }

  /** Reopens the auto row once the row that Edit opened in its place closed. */
  private giveBackAutoRow(): void {
    if (this.autoMadeWay && this.sessions.size === 0) {
      this.autoMadeWay = false;
      this.autoOpen();
    }
  }

  /** Removes the table. Open rows are closed without saving. */
  public destroy(): void {
    this.server?.abort();
    this.tableEl.removeEventListener('click', this.onClick);
    this.tableEl.removeEventListener('keydown', this.onKeyDown);
    this.tableEl.removeEventListener('click', this.onRowEvent);
    this.tableEl.removeEventListener('dblclick', this.onRowEvent);

    this.destroySessions();
    this.deleting.clear();
    this.selection?.destroy();
    this.rowLines.destroy();
    this.dataTable.destroy();
    this.hideLoadError();
    this.tableEl.remove();

    this.listeners.clear();
  }

  /** The row with this id, or `undefined`. */
  private findRow(id: string | number): ApiRowMethods<Row> | undefined {
    const rowId = this.rowId;

    if (rowId === undefined) {
      return undefined;
    }

    const row = this.dataTable.row((_index, data) => data[rowId] === id);

    return row.any() ? row : undefined;
  }

  /**
   * Closes everything tied to the rows on screen, before they're replaced:
   * open rows, the new row, deletes in progress, details.
   */
  private forgetRows(): void {
    this.destroySessions();
    this.autoMadeWay = false;
    this.deleting.clear();
    // Before the draw, so the new rows draw with a closed ▸.
    this.rowLines.destroy();
  }

  /**
   * Shows a row's new data, or its saved data again. With `server` only that
   * row is redrawn: a full draw would ask the server.
   */
  private redrawRow(id: string | number, data?: Row): void {
    const row = this.findRow(id);

    if (row === undefined) {
      return;
    }

    if (data === undefined) {
      // 'data', or DataTables would read the emptied cells back as data.
      row.invalidate('data');
    } else {
      row.data({ ...data });
      this.selection?.update(data);
    }

    if (this.server === undefined) {
      row.draw(false);
      return;
    }

    // What the draw listeners would do. Totals don't change: the server counts them.
    this.rowLines.sync();
    this.selection?.sync();
    this.currentRow?.sync();
  }

  /** Puts the error line above the table, or changes its text. */
  private showLoadError(message: string): void {
    if (this.loadError === undefined) {
      this.loadError = document.createElement('div');
      this.loadError.className = 'tdb-load-error';
      this.loadError.setAttribute('role', 'alert');
      this.tableEl.before(this.loadError);
    }

    // The message may come from the server: text only.
    this.loadError.textContent = message;
  }

  /** Removes the error line, if any. */
  private hideLoadError(): void {
    this.loadError?.remove();
    this.loadError = undefined;
  }

  /** For the methods that change rows by hand, which can't work when the server owns them. */
  private assertClientMode(method: string): void {
    if (this.server !== undefined) {
      throw new Error(`Tadabut: ${method} doesn't work with server. Use reload().`);
    }
  }

  /** The developer's mistake, so it goes to the console, once per field. */
  private warnMissingTotal(prop: string): void {
    if (!this.warnedTotals.has(prop)) {
      this.warnedTotals.add(prop);
      console.warn(`Tadabut: the server sent no total for "${prop}".`);
    }
  }

  /**
   * Closes every open row, the new one too. Only for when the rows are about
   * to go away: cells aren't restored.
   */
  private destroySessions(): void {
    for (const session of this.sessions.values()) {
      session.destroy();
    }

    this.sessions.clear();
    this.newRow?.destroy();
    this.newRow = undefined;
  }

  /** Also works after the session is gone, so a row can always be unlocked. */
  private setSaving(id: string | number, saving: boolean): void {
    const session = this.sessions.get(id);

    if (session !== undefined) {
      session.saving = saving;
    }

    const tr = this.findRow(id)?.node();

    if (tr) {
      tr.inert = saving;
      tr.classList.toggle('tdb-row-saving', saving);
    }
  }

  /** The last cell of a row, the one with the buttons. */
  private actionsCell(row: ApiRowMethods<Row>): HTMLTableCellElement {
    return this.dataTable
      .cell(row.index(), this.dtIndex(this.columns.length))
      .node() as HTMLTableCellElement;
  }

  /**
   * What the Delete button does: asks inline, asks with the user's function,
   * or deletes right away.
   */
  private async askDelete(id: string | number): Promise<void> {
    const row = this.findRow(id);

    if (row === undefined) {
      return;
    }

    if (this.confirmDelete === false) {
      await this.delete(id);
      return;
    }

    if (this.confirmDelete !== undefined) {
      if (await this.confirmDelete(row.data())) {
        await this.delete(id);
      }

      return;
    }

    const { parts, keep } = deleteQuestion(this.texts, this.classNames, this.icons);
    this.actionsCell(row).replaceChildren(...parts);

    // Focus was on the Delete button, which is gone. No is the safe default.
    keep.focus();
  }

  /** Puts Edit and Delete back after No. */
  private keepRow(id: string | number): void {
    this.redrawRow(id);
  }

  /** Whether an element is inside the new row, or its error. */
  private isInNewRow(element: Element): boolean {
    return this.newRow?.contains(element) ?? false;
  }

  /**
   * `undefined` for rows DataTables doesn't know, like a table inside a custom
   * editor, and for the lines under a row (detail and error), which DataTables
   * maps back to their row.
   */
  private rowIdOf(element: Element): string | number | undefined {
    const tr = element.closest('tr');

    if (tr === null || this.rowId === undefined) {
      return undefined;
    }

    const row = this.dataTable.row(tr);

    return row.any() && row.node() === tr ? (row.data()[this.rowId] as string | number) : undefined;
  }

  /**
   * Handles the action buttons, the new row's too. One listener on the
   * table, because DataTables keeps replacing rows. An arrow function, so
   * `this` stays bound and `destroy` can remove it.
   */
  private readonly onClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest<HTMLElement>('[data-tdb-action]');

    if (button === null) {
      return;
    }

    const action = button.dataset.tdbAction;

    if (!isButtonAction(action)) {
      return;
    }

    // DataTables doesn't know the new row, so rowIdOf can't find it.
    if (this.isInNewRow(button)) {
      if (action === 'save') {
        void this.saveNew();
      } else if (action === 'cancel') {
        this.cancelNew();
      }

      return;
    }

    const id = this.rowIdOf(button);

    if (id === undefined) {
      return;
    }

    switch (action) {
      case 'edit':
        this.edit(id);
        break;
      case 'save':
        void this.save(id);
        break;
      case 'cancel':
        this.cancel(id);
        break;
      case 'delete':
        void this.askDelete(id);
        break;
      case 'keep':
        this.keepRow(id);
        break;
      case 'confirm':
        void this.delete(id);
        break;
      case 'detail':
        this.toggleDetail(id);
        break;
    }
  };

  /** Enter saves, Escape cancels, in edited rows and the new row. */
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    // e.g. Select2 using Enter to pick an option
    if (event.defaultPrevented) {
      return;
    }

    // Enter on a button already clicks it (and Cancel must not save).
    if (!(event.target instanceof Element) || event.target.closest('button')) {
      return;
    }

    if (this.isInNewRow(event.target)) {
      if (event.key === 'Enter') {
        // Don't submit a surrounding <form>.
        event.preventDefault();
        void this.saveNew();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.cancelNew();
      }

      return;
    }

    const id = this.rowIdOf(event.target);

    if (id === undefined || !this.sessions.has(id)) {
      return;
    }

    switch (event.key) {
      case 'Enter':
        // Don't submit a surrounding <form>.
        event.preventDefault();
        void this.save(id);
        break;
      case 'Escape':
        event.preventDefault();
        this.cancel(id);
        break;
    }
  };

  /**
   * Writes every total. Runs after each redraw: search, paging, save, add,
   * delete and `setData` all redraw. With `'selected'`, also after each tick.
   * With `server`, the totals come from its last reply.
   */
  private readonly updateTotals = (): void => {
    const fromServer = this.server !== undefined && this.totalRows !== 'selected';
    const rows = fromServer ? [] : this.countedRows();

    this.columns.forEach((column, index) => {
      const cell = this.dataTable.column(this.dtIndex(index)).footer();

      if (column.total !== undefined && fromServer) {
        const value = this.server?.totals[column.prop];

        if (value === undefined) {
          cell.replaceChildren();
          this.warnMissingTotal(column.prop);
        } else {
          cell.replaceChildren(formatTotal(column, value));
        }
      } else if (column.total !== undefined) {
        cell.replaceChildren(totalText(column, rows));
      } else if (index === 0) {
        cell.textContent = this.texts.total;
      }
    });
  };

  /** Keeps the options a select loaded, for `getOptions`. An arrow function, so it can be passed as is. */
  private readonly rememberOptions = (
    prop: string,
    options: readonly SelectOption<unknown>[],
  ): void => {
    this.loadedOptions.set(prop, options);
  };

  /** Your column's index as DataTables counts it. */
  private dtIndex(index: number): number {
    return index + this.offset;
  }

  /** Shows or hides what editing needs, to match `editable`. */
  private applyEditable(): void {
    this.tableEl.classList.toggle('tdb-readonly', !this.editable);

    if (this.hasActions) {
      this.dataTable.column(this.dtIndex(this.columns.length)).visible(this.editable);
    }
  }

  /**
   * Puts Edit and Delete back on rows that were asking "Delete this row?", so
   * the question isn't still there when editing comes back on.
   */
  private forgetDeleteQuestions(): void {
    if (!this.hasActions) {
      return;
    }

    // Every page: paging doesn't redraw a row's cells, so the question stays.
    for (const node of this.dataTable.rows().nodes().toArray()) {
      const id = node === null ? undefined : this.rowIdOf(node);

      if (
        id !== undefined &&
        !this.deleting.has(id) &&
        node?.querySelector('.tdb-delete-question')
      ) {
        this.keepRow(id);
      }
    }
  }

  /**
   * The row a click landed on, or `undefined` if it doesn't count: buttons,
   * inputs, links, the checkbox, ▸ and buttons cells, the new row, a row
   * being edited, the header, the footer, and the lines under a row.
   */
  private clickedRow(event: MouseEvent): ApiRowMethods<Row> | undefined {
    const target = event.target;

    if (!(target instanceof Element)) {
      return undefined;
    }

    // closest, so an icon inside a button counts as the button.
    if (target.closest('button, input, select, textarea, label, a') !== null) {
      return undefined;
    }

    // A click that just missed the checkbox or a button.
    if (target.closest('td.tdb-select, td.tdb-detail, td.tdb-actions') !== null) {
      return undefined;
    }

    if (this.isInNewRow(target)) {
      return undefined;
    }

    const tr = target.closest('tr');

    // The class, not the sessions, so it works without rowId.
    if (tr === null || tr.classList.contains('tdb-row-editing')) {
      return undefined;
    }

    const row = this.dataTable.row(tr);

    // The header and footer aren't rows. A detail or error line is a child row,
    // which DataTables maps back to its parent row, so its `<tr>` isn't the row's.
    return row.any() && row.node() === tr ? row : undefined;
  }

  /** The rows the totals count: the ticked ones with `'selected'`, otherwise the ones `totalRows` picks. */
  private countedRows(): Row[] {
    if (this.totalRows === 'selected') {
      return this.selection?.selected() ?? [];
    }

    return this.dataTable.rows(rowsFor(this.totalRows)).data().toArray();
  }

  /**
   * Row clicks and double clicks. A click also moves the highlight with
   * `currentRow`, and a double click opens the row with `editing.doubleClick`. An arrow function, so `destroy` can remove it.
   */
  private readonly onRowEvent = (event: MouseEvent): void => {
    const row = this.clickedRow(event);

    if (row === undefined) {
      return;
    }

    if (event.type === 'click') {
      // `detail` is 2 on the second click of a double click, which would undo the first.
      // Before onRowClick, so isCurrent is already right in it.
      if (this.currentRow !== undefined && event.detail < 2) {
        this.currentRow.toggle(row.data()[this.rowId as keyof Row] as string | number);
      }

      this.listeners.emit('rowClick', row.data(), event);
      return;
    }

    // First, so isEditing is already true in onRowDoubleClick.
    if (this.editing.doubleClick && this.rowId !== undefined) {
      this.edit(row.data()[this.rowId] as string | number);
    }

    this.listeners.emit('rowDoubleClick', row.data(), event);
  };

  /**
   * After each reply with `server`: forgets the highlight if its row left,
   * and opens the auto row. An arrow function, so it can be passed as is.
   */
  private readonly afterServerDraw = (): void => {
    this.currentRow?.prune();
    this.autoOpen(this.focusNewRow);
    this.focusNewRow = false;
  };
}

/**
 * What `extend` returns: a table class like `Tadabut`, with its own defaults.
 * Written out because TypeScript can't describe the class `extend` builds.
 */
export type TadabutClass = {
  /** Builds a table with the class's defaults under `options`. */
  new <Row extends object>(container: HTMLElement, options: TadabutOptions<Row>): Tadabut<Row>;
  /** The options every table of this class starts with. */
  readonly defaults: DefaultOptions;
  /** A new class that builds on this one's defaults. */
  extend(defaults: DefaultOptions): TadabutClass;
};

/**
 * DataTables counts the checkbox column too, so `[[1, 'asc']]` from you means
 * its column 2. Moves each `[index, direction]` along; the default sorts by
 * your first column, as without selection. Other shapes of `order` are rare
 * and left as they are.
 */
function shiftOrder(
  order: DataTablesSettings['order'],
  offset: number,
): DataTablesSettings['order'] {
  if (order === undefined) {
    return [[offset, 'asc']];
  }

  if (!Array.isArray(order)) {
    return order;
  }

  return order.map((entry) =>
    Array.isArray(entry) && typeof entry[0] === 'number' ? [entry[0] + offset, entry[1]] : entry,
  ) as DataTablesSettings['order'];
}
