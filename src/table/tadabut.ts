import DataTable, { type Api, type ApiRowMethods } from 'datatables.net';
import type { Column } from '../columns/column';
import { toDataTables } from '../columns/to-datatables';
import { type EditableCell, EditSession } from '../editing/session';
import { addClasses } from '../editors/classes';
import { en } from '../texts/en';
import type { Texts } from '../texts/texts';
import { checkOptions } from './check-options';
import {
  type Action,
  deleteQuestion,
  isButtonAction,
  rowErrorMessage,
  saveCancelButtons,
} from './elements';
import { NewRow } from './new-row';
import type {
  DataTablesSettings,
  EditingOptions,
  TableClassNames,
  TadabutOptions,
} from './options';
import type { RowScope } from './scope';
import { Selection } from './selection';
import { footerFor, rowsFor, totalText } from './totals';

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
  /** The user's classes, or `{}`. */
  private readonly classNames: TableClassNames;
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
  /** Rows waiting for `onDelete`, by row id. */
  private readonly deleting: Set<string | number> = new Set();
  /** The row `add()` opened, if any. */
  private newRow?: NewRow<Row>;
  /** Whether any column has a `total`, so the table has a footer. */
  private readonly hasTotals: boolean;
  /** Which rows the totals count, with its default filled in. */
  private readonly totalRows: RowScope;
  /** How many columns Tadabut adds before yours: 1 with `selection`. */
  private readonly offset: number;
  /** The ticked rows. Only with `selection`. */
  private readonly selection?: Selection<Row>;

  /**
   * Builds the table inside `container`, which should be empty.
   *
   * @throws If a column has an `editor` and there's no `rowId`.
   * @throws If `onDelete` is set and there's no `rowId`.
   * @throws If `selection` is on and there's no `rowId`.
   * @throws If a hidden column (`visible: false`) has an `editor`.
   * @throws If a select's `labelProp` is its own column.
   * @throws If a money editor's `separator` and `point` are the same.
   */
  public constructor(container: HTMLElement, options: TadabutOptions<Row>) {
    checkOptions(options);

    this.hasEditor = options.columns.some((column) => column.editor !== undefined);
    this.rowId = options.rowId;
    this.columns = options.columns;
    this.editing = {
      mode: options.editing?.mode ?? 'single',
      button: options.editing?.button ?? true,
    };

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
    this.confirmDelete = options.confirmDelete;
    this.classNames = options.classNames ?? {};
    this.texts = { ...en, ...options.texts };
    this.hasTotals = options.columns.some((column) => column.total !== undefined);
    this.totalRows = options.totalRows ?? 'searched';
    this.offset = options.selection ? 1 : 0;

    this.tableEl = document.createElement('table');
    addClasses(this.tableEl, [], this.classNames.table);
    container.appendChild(this.tableEl);

    // Before DataTables starts, or it won't manage the footer.
    if (this.hasTotals) {
      this.tableEl.append(footerFor(this.offset + this.columns.length + (this.hasActions ? 1 : 0)));
    }

    this.dataTable = new DataTable(this.tableEl, {
      ...options.dataTables,
      ...(this.offset > 0 && { order: shiftOrder(options.dataTables?.order, this.offset) }),
      data: [...options.data],
      columns: toDataTables(options.columns, actions, this.classNames, this.texts, this.offset > 0),
    });

    if (this.offset > 0) {
      this.selection = new Selection({
        dataTable: this.dataTable,
        rowId: this.rowId as keyof Row & string,
        scope:
          typeof options.selection === 'object'
            ? (options.selection.checkAll ?? 'searched')
            : 'searched',
        onSelect: options.onSelect,
      });
      this.dataTable.on('draw', () => this.selection?.sync());
      this.selection.sync();
    }

    // The first draw already happened inside `new DataTable`.
    if (this.hasTotals) {
      this.dataTable.on('draw', this.updateTotals);
      this.updateTotals();
    }

    if (this.hasActions) {
      this.tableEl.addEventListener('click', this.onClick);
    }

    if (this.hasEditor) {
      this.tableEl.addEventListener('keydown', this.onKeyDown);
    }
  }

  /**
   * Replaces all rows. Sorting, search and the page are kept.
   *
   * Open rows, and the new row, are closed first, and their unsaved changes
   * are lost.
   */
  public setData(rows: readonly Row[]): void {
    this.destroySessions();
    this.deleting.clear();

    this.dataTable
      .clear()
      .rows.add([...rows])
      .draw(false);

    this.selection?.prune();
  }

  /**
   * Opens a row for editing.
   *
   * @param id The value of the row's `rowId` field.
   * @returns `false` if the row doesn't exist, is already open, another row
   *   or the new row is open in `'single'` mode, nothing is editable, the row
   *   is being deleted, or it's on a page that hasn't been displayed yet.
   */
  public edit(id: string | number): boolean {
    if (
      !this.hasEditor ||
      this.sessions.has(id) ||
      (this.editing.mode === 'single' && (this.sessions.size > 0 || this.newRow !== undefined)) ||
      this.deleting.has(id)
    ) {
      return false;
    }

    const row = this.findRow(id);

    // With deferred rendering, rows on pages never shown have no cells yet.
    if (row === undefined || row.node() === null) {
      return false;
    }

    const rowIndex = row.index();
    const cells: EditableCell<Row>[] = [];

    this.columns.forEach((column, columnIndex) => {
      if (column.editor !== undefined) {
        const cell = this.dataTable.cell(rowIndex, this.dtIndex(columnIndex)).node();
        cells.push({ column, cell: cell as HTMLTableCellElement });
      }
    });

    this.sessions.set(id, new EditSession(row.data(), cells, this.texts));
    row.node()?.classList.add('tdb-row-editing');

    // Redrawing the row on save/cancel brings Edit and Delete back.
    if (this.hasActions) {
      this.actionsCell(row).replaceChildren(...saveCancelButtons(this.texts, this.classNames));
    }

    return true;
  }

  /**
   * Opens an empty row at the top of the table, for a new row. `defaults` are
   * its starting values. The row is only added once Save works.
   *
   * @returns `false` if no column has an editor, a new row is already open,
   *   or a row is being edited in `'single'` mode.
   *
   * @example
   * table.add({ country: 'MA' });
   */
  public add(defaults: Partial<Row> = {}): boolean {
    if (
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
      leadingCells: this.offset,
    });

    this.tableEl.insertBefore(newRow.body, this.dataTable.table().body());
    newRow.focus();
    this.newRow = newRow;

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

  /**
   * Validates the new row, then calls `onAdd`. On success the row joins the
   * table, and the table shows the page it landed on.
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

    this.clearRowError(id);
    this.findRow(id)?.node()?.classList.remove('tdb-row-editing');

    // 'data', or DataTables would read the emptied cells back as data.
    this.findRow(id)?.invalidate('data').draw(false);
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
   */
  public async save(id: string | number): Promise<boolean> {
    const session = this.sessions.get(id);

    if (session === undefined || session.saving) {
      return false;
    }

    session.clearErrors();
    this.clearRowError(id);

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
      this.showRowError(id, error instanceof Error ? error.message : this.texts.saveFailed);
      return false;
    }

    // setData or destroy may have run while we were waiting.
    if (this.sessions.get(id) !== session) {
      return false;
    }

    session.destroy();
    this.sessions.delete(id);

    this.findRow(id)
      ?.data({ ...saved })
      .draw(false);
    this.findRow(id)?.node()?.classList.remove('tdb-row-editing');
    this.setSaving(id, false);

    return true;
  }

  /**
   * Calls `onDelete`, then removes the row. Never asks first: only the
   * Delete button does.
   *
   * While `onDelete` runs the row is locked. If it throws, the row stays and
   * the error message is shown under it.
   *
   * @returns `true` once the row is removed. `false` if the row doesn't
   *   exist, is open for editing, is already being deleted, or `onDelete`
   *   threw.
   */
  public async delete(id: string | number): Promise<boolean> {
    const row = this.findRow(id);

    if (row === undefined || this.sessions.has(id) || this.deleting.has(id)) {
      return false;
    }

    this.clearRowError(id);
    this.deleting.add(id);
    this.setSaving(id, true);

    try {
      await this.onDelete?.(row.data());
    } catch (error) {
      // setData or destroy may have run while we were waiting.
      if (!this.deleting.has(id)) {
        return false;
      }

      this.deleting.delete(id);
      this.setSaving(id, false);
      this.keepRow(id);
      this.showRowError(id, error instanceof Error ? error.message : this.texts.deleteFailed);

      return false;
    }

    if (!this.deleting.has(id)) {
      return false;
    }

    this.deleting.delete(id);

    this.findRow(id)?.remove().draw(false);

    this.selection?.prune();

    return true;
  }

  /** Removes the table. Open rows are closed without saving. */
  public destroy(): void {
    this.tableEl.removeEventListener('click', this.onClick);
    this.tableEl.removeEventListener('keydown', this.onKeyDown);
    this.destroySessions();
    this.deleting.clear();
    this.selection?.destroy();
    this.dataTable.destroy();
    this.tableEl.remove();
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

  /** Shows a save or delete error in a child row under the row. */
  private showRowError(id: string | number, message: string): void {
    this.findRow(id)?.child(rowErrorMessage(message), 'tdb-row-error').show();
  }

  /** Removes the save or delete error under a row, if any. */
  private clearRowError(id: string | number): void {
    this.findRow(id)?.child.remove();
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

    const { parts, keep } = deleteQuestion(this.texts, this.classNames);
    this.actionsCell(row).replaceChildren(...parts);

    // Focus was on the Delete button, which is gone. No is the safe default.
    keep.focus();
  }

  /** Puts Edit and Delete back after No. */
  private keepRow(id: string | number): void {
    this.findRow(id)?.invalidate('data').draw(false);
  }

  /** Whether an element is inside the new row, or its error. */
  private isInNewRow(element: Element): boolean {
    return this.newRow?.contains(element) ?? false;
  }

  /**
   * `undefined` for rows DataTables doesn't know, like the error row or
   * a table inside a custom editor.
   */
  private rowIdOf(element: Element): string | number | undefined {
    const tr = element.closest('tr');

    if (tr === null || this.rowId === undefined) {
      return undefined;
    }

    const row = this.dataTable.row(tr);

    return row.any() ? (row.data()[this.rowId] as string | number) : undefined;
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
   * delete and `setData` all redraw.
   */
  private readonly updateTotals = (): void => {
    const rows = this.dataTable.rows(rowsFor(this.totalRows)).data().toArray();

    this.columns.forEach((column, index) => {
      const cell = this.dataTable.column(this.dtIndex(index)).footer();

      if (column.total !== undefined) {
        cell.textContent = totalText(column, rows);
      } else if (index === 0) {
        cell.textContent = this.texts.total;
      }
    });
  };

  /** Your column's index as DataTables counts it. */
  private dtIndex(index: number): number {
    return index + this.offset;
  }
}

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
