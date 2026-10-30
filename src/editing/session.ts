import type { Column } from '../columns/column';
import { type AnyEditorInstance, createEditor } from '../editors/create';
import { type AnyValidatedEditor, messages, validateValue } from '../validation/validate';

/** An editable column, paired with its cell in the row being edited. */
export type EditableCell<Row extends object> = {
  readonly column: Column<Row>;
  readonly cell: HTMLTableCellElement;
};

/** Counter for unique error element ids, like `tdb-error-3`. */
let errorCount = 0;

/** A live editor and the config it was created from. */
type Field = {
  readonly editor: AnyEditorInstance;
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
   * For each field, the selects that depend on it: when it changes, they
   * are cleared and their options load again.
   */
  private readonly dependents: Map<string, (keyof Row & string)[]> = new Map();

  /** The fields whose last options load failed. */
  private readonly loadErrors: Set<keyof Row & string> = new Set();

  /**
   * `true` while `onSave` runs. Set by `Tadabut`, which ignores a second
   * save, or a cancel, during that time.
   */
  public saving = false;

  /**
   * Replaces each cell's content with an editor showing the row's value,
   * then loads the options of every select whose `options` is a function.
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

      if (config.type === 'select' && config.dependsOn !== undefined) {
        const list = this.dependents.get(config.dependsOn) ?? [];
        list.push(column.prop);
        this.dependents.set(config.dependsOn, list);
      }

      const editor = createEditor(config, {
        value: this.originalData[column.prop],
        onChange: () => this.changed(column.prop),
      });

      cell.replaceChildren(editor.element);
      this.fields.set(column.prop, { editor, config });
    }

    // After the loop, so every field exists. Editors without an options function finish at once.
    for (const prop of this.fields.keys()) {
      void this.loadField(prop);
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
      // A select whose options failed to load can't be valid: the user had
      // nothing to pick from.
      const message = this.loadErrors.has(prop)
        ? messages.loadFailed
        : validateValue(config, editor.getValue(), row);

      if (message !== undefined) {
        errors.set(prop, message);
      }
    }

    return errors;
  }

  /**
   * Shows each error message under its field's editor.
   *
   * Errors already shown are removed first.
   *
   * @param errors The error message of each invalid field, by row property,
   *   as returned by `validate`.
   */
  public showErrors(errors: Map<keyof Row & string, string>): void {
    this.clearErrors();

    for (const [prop, message] of errors) {
      this.showError(prop, message);
    }
  }

  /**
   * Removes every error message, and the ARIA attributes that point at them.
   */
  public clearErrors(): void {
    for (const prop of [...this.errors.keys()]) {
      this.hideError(prop);
    }
  }

  /**
   * Puts the cursor in a field's editor. Does nothing if the field isn't
   * being edited.
   *
   * @param prop The row property of the field.
   */
  public focus(prop: keyof Row & string): void {
    this.fields.get(prop)?.editor.focus();
  }

  /**
   * Destroys every editor and error message. Safe to call more than once.
   *
   * The editable cells are left empty: the caller must put their content
   * back.
   */
  public destroy(): void {
    this.clearErrors();

    // Destroying a select also stops its running load.
    for (const { editor } of this.fields.values()) {
      editor.destroy();
    }

    this.fields.clear();
    this.dependents.clear();
    this.loadErrors.clear();
  }

  /**
   * Shows one error message under a field's editor, replacing the one that
   * was there.
   *
   * The editor's element gets `aria-invalid` and points at the message with
   * `aria-describedby`, so screen readers read the error with the field.
   */
  private showError(prop: keyof Row & string, message: string): void {
    const field = this.fields.get(prop);

    if (field === undefined) {
      return;
    }

    this.hideError(prop);

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

  /** Removes one field's error message and its ARIA attributes, if shown. */
  private hideError(prop: keyof Row & string): void {
    const error = this.errors.get(prop);

    if (error === undefined) {
      return;
    }

    error.remove();
    this.errors.delete(prop);

    const element = this.fields.get(prop)?.editor.element;
    element?.removeAttribute('aria-invalid');
    element?.removeAttribute('aria-describedby');
  }

  /**
   * Runs when the user changes a field: every select below it in the chain
   * is cleared, then loads its options again.
   *
   * Example, with Country → Region → City: changing the country clears the
   * region and the city, then both reload.
   */
  private changed(prop: keyof Row & string): void {
    // `prop` starts in the set so a loop never clears the field the user
    // just changed. It's removed after: it doesn't need to reload.
    const cleared = new Set<keyof Row & string>([prop]);
    this.clearBelow(prop, cleared);
    cleared.delete(prop);

    // Only after everything is cleared, so each load gets a clean row: the
    // new value, and nothing left from before below it.
    for (const field of cleared) {
      void this.loadField(field);
    }
  }

  /**
   * Clears the fields that depend on `prop`, then the ones that depend on
   * those, and so on. `setValue` never calls `onChange`, so the chain has to
   * be walked here.
   *
   * @param cleared The fields cleared so far. A field already in it is
   *   skipped, so a loop (A depends on B, B depends on A) can't run forever.
   */
  private clearBelow(prop: string, cleared: Set<keyof Row & string>): void {
    for (const dependent of this.dependents.get(prop) ?? []) {
      if (cleared.has(dependent)) {
        continue;
      }

      cleared.add(dependent);
      this.fields.get(dependent)?.editor.setValue(null);
      this.clearBelow(dependent, cleared);
    }
  }

  /**
   * Loads a field's options with the current row, and shows or hides
   * "Could not load the options." under it.
   *
   * Fields that aren't selects with an options function finish at once.
   */
  private async loadField(prop: keyof Row & string): Promise<void> {
    const field = this.fields.get(prop);

    if (field?.editor.load === undefined) {
      return;
    }

    const result = await field.editor.load(this.getRow() as Record<string, unknown>);

    // A newer load or destroy took over: what happens next is up to them.
    if (result === 'cancelled') {
      return;
    }

    if (result === 'failed') {
      this.loadErrors.add(prop);
      this.showError(prop, messages.loadFailed);
      return;
    }

    if (this.loadErrors.delete(prop)) {
      this.hideError(prop);
    }
  }
}
