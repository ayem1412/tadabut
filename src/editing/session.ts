import type { Column } from '../columns/column';
import { createEditor } from '../editors/create';
import type { EditorInstance } from '../editors/instance';
import { type AnyValidatedEditor, validateValue } from '../validation/validate';

/** An editable column, paired with its cell in the row being edited. */
export type EditableCell<Row extends object> = {
  readonly column: Column<Row>;
  readonly cell: HTMLTableCellElement;
};

/** Counter for unique error element ids, like `tdb-error-3`. */
let errorCount = 0;

/** A live editor and the config it was created from. */
type Field = {
  readonly editor: EditorInstance<unknown>;
  readonly config: AnyValidatedEditor;
};

/**
 * Everything about one row while it is being edited.
 *
 * Internal. It knows nothing about DataTables: `Tadabut` finds the cells and
 * passes them in, and puts the cells' text back after `destroy`.
 *
 * @typeParam Row - The shape of one row.
 */
export class EditSession<Row extends object> {
  /** A copy of the row as it was when editing started. */
  public readonly originalData: Row;

  /** The edited fields, by row property. */
  private readonly fields: Map<keyof Row & string, Field> = new Map();

  /** The error messages being shown, by row property. */
  private readonly errors: Map<keyof Row & string, HTMLElement> = new Map();

  /**
   * `true` while `onSave` runs. Set by `Tadabut`, which ignores a second
   * save, or a cancel, during that time.
   */
  public saving = false;

  /**
   * Replaces each cell's content with an editor showing the row's value.
   *
   * @param row The row to edit.
   * @param cells The editable columns and their cells. Columns without an
   *   `editor` are skipped.
   */
  public constructor(row: Row, cells: readonly EditableCell<Row>[]) {
    this.originalData = { ...row };

    for (const { column, cell } of cells) {
      if (column.editor === undefined) {
        continue;
      }

      // Safe: `Column<Row>` already checked that the config fits the column.
      const config = column.editor as AnyValidatedEditor;
      const editor = createEditor(config, {
        value: this.originalData[column.prop],
        onChange: () => {},
      });

      cell.replaceChildren(editor.element);
      this.fields.set(column.prop, { editor, config });
    }
  }

  /**
   * Returns the row as the user has edited it so far: a copy of the
   * original, with each edited field replaced by its editor's value.
   * Fields that aren't edited are kept as they were.
   *
   * The result can hold `null` where `Row` says it can't, like an empty
   * number editor on an `age: number` column. Validate before using it.
   */
  public getRow(): Row {
    const row = { ...this.originalData } as Record<string, unknown>;

    for (const [prop, { editor }] of this.fields) {
      row[prop] = editor.getValue();
    }

    // Safe: each editor was created from its column's config, and
    // `Column<Row>` checked that the config fits the column.
    return row as Row;
  }

  /**
   * Checks every field against its rules.
   *
   * Each field is checked with the whole edited row, so a rule can compare
   * it with other new values.
   *
   * @returns The error message of each invalid field, by row property.
   *   Empty when everything is valid.
   */
  public validate(): Map<keyof Row & string, string> {
    const row = this.getRow();
    const errors = new Map<keyof Row & string, string>();

    for (const [prop, { editor, config }] of this.fields) {
      const message = validateValue(config, editor.getValue(), row);

      if (message !== undefined) {
        errors.set(prop, message);
      }
    }

    return errors;
  }

  /**
   * Shows each error message under its field's editor.
   *
   * The editor's element gets `aria-invalid` and points at the message with
   * `aria-describedby`, so screen readers read the error with the field.
   *
   * Errors already shown are removed first.
   *
   * @param errors The error message of each invalid field, by row property,
   *   as returned by `validate`.
   */
  public showErrors(errors: Map<keyof Row & string, string>): void {
    this.clearErrors();

    for (const [prop, message] of errors) {
      const field = this.fields.get(prop);

      if (field === undefined) {
        continue;
      }

      errorCount += 1;
      const error = document.createElement('div');
      error.id = `tdb-error-${errorCount}`;
      error.className = 'tdb-error';
      error.textContent = message;

      field.editor.element.after(error);
      field.editor.element.setAttribute('aria-invalid', 'true');
      field.editor.element.setAttribute('aria-describedby', error.id);

      this.errors.set(prop, error);
    }
  }

  /**
   * Removes every error message, and the ARIA attributes that point at them.
   */
  public clearErrors(): void {
    for (const [prop, error] of this.errors) {
      error.remove();

      const element = this.fields.get(prop)?.editor.element;
      element?.removeAttribute('aria-invalid');
      element?.removeAttribute('aria-describedby');
    }

    this.errors.clear();
  }

  /**
   * Destroys every editor and error message. Safe to call more than once.
   *
   * The editable cells are left empty: the caller must put their content
   * back.
   */
  public destroy(): void {
    this.clearErrors();

    for (const { editor } of this.fields.values()) {
      editor.destroy();
    }

    this.fields.clear();
  }
}
