import type { Column } from '../columns/column';
import { type EditableCell, EditSession } from '../editing/session';
import { addClasses } from '../editors/classes';
import type { Texts } from '../texts/texts';
import { rowErrorMessage, saveCancelButtons } from './elements';
import type { TableClassNames } from './options';

/** What a new row needs to know about its table. */
export type NewRowOptions<Row extends object> = {
  /** All the table's columns, hidden ones too. */
  readonly columns: readonly Column<Row>[];
  /** Whether the column at this index is shown. */
  readonly isVisible: (index: number) => boolean;
  /** Whether the table has an actions column, for Save and Cancel. */
  readonly withButtons: boolean;
  /** The table's texts. */
  readonly texts: Texts;
  /** The table's classes. */
  readonly classNames: TableClassNames;
  /** Empty cells before the columns, for the checkbox column. */
  readonly leadingCells: number;
};

/**
 * The row `add()` opens. It lives in its own `<tbody>`, above DataTables'
 * one, so sorting, search and paging never move it. DataTables doesn't know
 * about it, so nothing here goes through DataTables.
 */
export class NewRow<Row extends object> {
  /** The `<tbody>` to put in the table. Removing it removes everything. */
  public readonly body: HTMLTableSectionElement;
  /** The row itself. */
  private readonly tr: HTMLTableRowElement;
  /** Its inputs. */
  private readonly session: EditSession<Row>;
  /** The first column with an editor, for the focus. */
  private readonly firstProp: (keyof Row & string) | undefined;

  /** Builds the row. Nothing is shown until `body` is put in the table. */
  public constructor(defaults: Partial<Row>, options: NewRowOptions<Row>) {
    this.body = document.createElement('tbody');
    this.body.classList.add('tdb-new-rows');

    this.tr = document.createElement('tr');
    this.tr.classList.add('tdb-row-new', 'tdb-row-editing');

    for (let index = 0; index < options.leadingCells; index++) {
      this.tr.append(document.createElement('td'));
    }

    const cells: EditableCell<Row>[] = [];

    options.columns.forEach((column, index) => {
      // DataTables has no cell for a hidden column, so the others would shift.
      if (!options.isVisible(index)) {
        return;
      }

      const cell = document.createElement('td');
      addClasses(cell, [], column.className);

      if (column.editor !== undefined) {
        cells.push({ column, cell });
      } else {
        cell.textContent = String(defaults[column.prop] ?? '');
      }

      this.tr.append(cell);
    });

    if (options.withButtons) {
      const actionsCell = document.createElement('td');
      actionsCell.classList.add('tdb-actions');
      actionsCell.replaceChildren(...saveCancelButtons(options.texts, options.classNames));
      this.tr.append(actionsCell);
    }

    this.body.append(this.tr);

    // Editors expect `null` for "empty", not a missing field.
    const start: Record<string, unknown> = { ...defaults };

    for (const { column } of cells) {
      start[column.prop] ??= null;
    }

    // The session only reads the fields it edits, so a partial row is enough.
    this.session = new EditSession(start as Row, cells, options.texts);
    this.firstProp = cells[0]?.column.prop;
  }

  /** Whether `onAdd` is running. */
  public get saving(): boolean {
    return this.session.saving;
  }

  /** Whether an element is inside this row, or its error. */
  public contains(element: Element): boolean {
    return this.body.contains(element);
  }

  /** Puts the cursor in the first input. Only works once `body` is in the page. */
  public focus(): void {
    if (this.firstProp !== undefined) {
      this.session.focus(this.firstProp);
    }
  }

  /**
   * Clears the old errors, then checks every field. Shows the new errors and
   * puts the cursor on the first wrong field.
   *
   * @returns Whether every field is valid.
   */
  public validate(): boolean {
    this.session.clearErrors();
    this.clearError();

    const errors = this.session.validate();
    const [firstInvalid] = errors.keys();

    if (firstInvalid === undefined) {
      return true;
    }

    this.session.showErrors(errors);
    this.session.focus(firstInvalid);

    return false;
  }

  /** The row with what was typed. Validate first. */
  public getRow(): Row {
    return this.session.getRow();
  }

  /** Locks or unlocks the row while `onAdd` runs. */
  public setSaving(saving: boolean): void {
    this.session.saving = saving;
    this.tr.inert = saving;
    this.tr.classList.toggle('tdb-row-saving', saving);
  }

  /**
   * Shows the error in a line under the row, like DataTables' child rows
   * (which only work under DataTables' own rows).
   */
  public showError(message: string): void {
    this.clearError();

    const cell = document.createElement('td');
    cell.colSpan = this.tr.cells.length;
    cell.append(rowErrorMessage(message));

    const line = document.createElement('tr');
    line.className = 'tdb-row-error';
    line.append(cell);

    this.body.append(line);
  }

  /** Removes the error line, if any. */
  public clearError(): void {
    this.body.querySelector('tr.tdb-row-error')?.remove();
  }

  /** Stops pending loads and takes the row out of the table. */
  public destroy(): void {
    this.session.destroy();
    this.body.remove();
  }
}
