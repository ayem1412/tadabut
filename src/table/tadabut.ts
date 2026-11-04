import DataTable, { type Api, type ApiRowMethods } from 'datatables.net';
import type { Column } from '../columns/column';
import { toDataTables } from '../columns/to-datatables';
import { type EditableCell, EditSession } from '../editing/session';
import { addClasses, splitClasses } from '../editors/classes';
import { en } from '../texts/en';
import type { Texts } from '../texts/texts';
import type { EditingOptions, TableClassNames, TadabutOptions } from './options';

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
  private readonly rowId: (keyof Row & string) | undefined;
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
  /** Whether the Edit/Save/Cancel column exists. */
  private readonly hasActions: boolean;
  /** Whether any column has an editor. */
  private readonly hasEditor: boolean;
  /** Open rows, by row id. */
  private readonly sessions: Map<string | number, EditSession<Row>> = new Map();

  /**
   * Builds the table inside `container`, which should be empty.
   *
   * @throws If a column has an `editor` and there's no `rowId`.
   * @throws If a hidden column (`visible: false`) has an `editor`.
   * @throws If a select's `labelProp` is its own column.
   */
  public constructor(container: HTMLElement, options: TadabutOptions<Row>) {
    this.hasEditor = options.columns.some((column) => column.editor !== undefined);

    if (this.hasEditor && options.rowId === undefined) {
      throw new Error('Tadabut: rowId is required when a column has an editor.');
    }

    // Not `!column.visible`: undefined means visible.
    const hiddenEditable = options.columns.find(
      (column) => column.editor !== undefined && column.visible === false,
    );

    if (hiddenEditable !== undefined) {
      throw new Error(
        `Tadabut: the "${hiddenEditable.prop}" column can't have both an editor and visible: false.`,
      );
    }

    const selfLabeled = options.columns.find(
      (column) => column.editor?.type === 'select' && column.editor.labelProp === column.prop,
    );

    if (selfLabeled !== undefined) {
      throw new Error(
        `Tadabut: the "${selfLabeled.prop}" column's labelProp can't be "${selfLabeled.prop}" itself.`,
      );
    }

    this.rowId = options.rowId;
    this.columns = options.columns;
    this.editing = {
      mode: options.editing?.mode ?? 'single',
      button: options.editing?.button ?? true,
    };
    this.hasActions = this.hasEditor && this.editing.button;
    this.onSave = options.onSave;
    this.classNames = options.classNames ?? {};
    this.texts = { ...en, ...options.texts };

    this.tableEl = document.createElement('table');
    addClasses(this.tableEl, [], this.classNames.table);
    container.appendChild(this.tableEl);

    this.dataTable = new DataTable(this.tableEl, {
      // Spread first so `data` and `columns` can't be overridden from JS.
      ...options.dataTables,
      data: [...options.data],
      columns: toDataTables(options.columns, this.hasActions, this.classNames, this.texts),
    });

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
   * Open rows are closed first, and their unsaved changes are lost.
   */
  public setData(rows: readonly Row[]): void {
    this.destroySessions();

    this.dataTable
      .clear()
      .rows.add([...rows])
      .draw(false);
  }

  /**
   * Opens a row for editing.
   *
   * @param id The value of the row's `rowId` field.
   * @returns `false` if the row doesn't exist, is already open, another row
   *   is open in `'single'` mode, nothing is editable, or the row is on a
   *   page that hasn't been displayed yet.
   */
  public edit(id: string | number): boolean {
    if (
      !this.hasEditor ||
      this.sessions.has(id) ||
      (this.editing.mode === 'single' && this.sessions.size > 0)
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
        const cell = this.dataTable.cell(rowIndex, columnIndex).node();
        cells.push({ column, cell: cell as HTMLTableCellElement });
      }
    });

    this.sessions.set(id, new EditSession(row.data(), cells, this.texts));
    row.node()?.classList.add('tdb-row-editing');

    // Redrawing the row on save/cancel brings the Edit button back.
    if (this.hasActions) {
      this.dataTable
        .cell(rowIndex, this.columns.length)
        .node()
        .replaceChildren(
          actionButton(
            'save',
            this.texts.save,
            splitClasses(this.classNames.button, this.classNames.save),
          ),
          actionButton(
            'cancel',
            this.texts.cancel,
            splitClasses(this.classNames.button, this.classNames.cancel),
          ),
        );
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

    this.clearSaveError(id);
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
    this.clearSaveError(id);

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
      this.showSaveError(id, error instanceof Error ? error.message : this.texts.saveFailed);
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

  /** Removes the table. Open rows are closed without saving. */
  public destroy(): void {
    this.tableEl.removeEventListener('click', this.onClick);
    this.tableEl.removeEventListener('keydown', this.onKeyDown);
    this.destroySessions();
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

  /** Only for when the rows are about to go away: cells aren't restored. */
  private destroySessions(): void {
    for (const session of this.sessions.values()) {
      session.destroy();
    }

    this.sessions.clear();
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

  /**
   * Shows the error in a child row under the row. The message gets its own
   * class because Bootstrap colors every cell, which hides a color on the
   * `<tr>`. Set as text: it often comes from a server.
   */
  private showSaveError(id: string | number, message: string): void {
    const error = document.createElement('div');
    error.className = 'tdb-save-error-message';
    error.textContent = message;

    this.findRow(id)?.child(error, 'tdb-save-error').show();
  }

  /** Removes the error row under a row, if any. */
  private clearSaveError(id: string | number): void {
    this.findRow(id)?.child.remove();
  }

  /**
   * `undefined` for rows DataTables doesn't know, like the save error row or
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
   * Handles Edit, Save and Cancel. One listener on the table, because
   * DataTables keeps replacing rows. An arrow function, so `this` stays
   * bound and `destroy` can remove it.
   */
  private readonly onClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest<HTMLElement>('[data-tdb-action]');
    const id = button ? this.rowIdOf(button) : undefined;

    if (!button || id === undefined) {
      return;
    }

    switch (button.dataset.tdbAction) {
      case 'edit':
        this.edit(id);
        break;
      case 'save':
        void this.save(id);
        break;
      case 'cancel':
        this.cancel(id);
        break;
    }
  };

  /** Enter saves, Escape cancels. */
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    // e.g. Select2 using Enter to pick an option
    if (event.defaultPrevented) {
      return;
    }

    // Enter on a button already clicks it (and Cancel must not save).
    if (!(event.target instanceof Element) || event.target.closest('button')) {
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
}

/** Builds a Save or Cancel button. */
function actionButton(
  action: 'save' | 'cancel',
  label: string,
  extra: readonly string[],
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('tdb-button', `tdb-button-${action}`, ...extra);
  button.dataset.tdbAction = action;
  button.textContent = label;

  return button;
}
