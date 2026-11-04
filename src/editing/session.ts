import type { Column } from '../columns/column';
import { type AnyEditorInstance, createEditor } from '../editors/create';
import { en } from '../texts/en';
import type { Texts } from '../texts/texts';
import { type AnyValidatedEditor, validateValue } from '../validation/validate';

/** A column with an editor, and its cell in the open row. */
export type EditableCell<Row extends object> = {
  /** The column the cell belongs to. */
  readonly column: Column<Row>;
  /** Where the editor goes. */
  readonly cell: HTMLTableCellElement;
};

/** For unique error ids (`aria-describedby` needs one). */
let errorCount = 0;

/** A live editor and the config it came from. */
type Field = {
  /** The input in the cell. */
  readonly editor: AnyEditorInstance;
  /** Used for validation and `dependsOn`. */
  readonly config: AnyValidatedEditor;
};

/**
 * One open row. Doesn't know about DataTables: `Tadabut` hands it the cells
 * and restores them afterwards.
 */
export class EditSession<Row extends object> {
  /** A copy of the row from before editing. `onSave` gets it as `previous`. */
  public readonly originalData: Row;
  /** Open fields, by row field. */
  private readonly fields: Map<keyof Row & string, Field> = new Map();
  /** Error messages on screen, by row field. */
  private readonly errors: Map<keyof Row & string, HTMLElement> = new Map();
  /** For each field, the selects that depend on it. */
  private readonly dependents: Map<string, (keyof Row & string)[]> = new Map();
  /** Selects whose last options load failed. */
  private readonly loadErrors: Set<keyof Row & string> = new Set();
  /** Set by `Tadabut` while `onSave` runs. */
  public saving = false;
  /** Error messages and the "Loading…" text. */
  private readonly texts: Texts;

  /** Puts an editor in each cell and starts loading select options. */
  public constructor(row: Row, cells: readonly EditableCell<Row>[], texts: Texts = en) {
    this.originalData = { ...row };
    this.texts = texts;

    for (const { column, cell } of cells) {
      if (column.editor === undefined) {
        continue;
      }

      const config = column.editor as AnyValidatedEditor;

      if (config.type === 'select' && config.dependsOn !== undefined) {
        const list = this.dependents.get(config.dependsOn) ?? [];
        list.push(column.prop);
        this.dependents.set(config.dependsOn, list);
      }

      const editor = createEditor(
        config,
        { value: this.originalData[column.prop], onChange: () => this.changed(column.prop) },
        texts,
      );

      cell.replaceChildren(editor.element);
      this.fields.set(column.prop, { editor, config });
    }

    // Only once all fields exist, since loaders get the whole row.
    for (const prop of this.fields.keys()) {
      void this.loadField(prop);
    }
  }

  /**
   * The row with the current editor values. It can hold `null` where `Row`
   * doesn't allow it (an empty number input), so validate before trusting it.
   */
  public getRow(): Row {
    const row = { ...this.originalData } as Record<string, unknown>;

    for (const [prop, { editor, config }] of this.fields) {
      row[prop] = editor.getValue();

      // `undefined` means the options are still loading. The value hasn't
      // changed then, so the old label is still correct.
      if (config.type === 'select' && config.labelProp !== undefined) {
        const label = editor.getLabel?.();

        if (label !== undefined) {
          row[config.labelProp] = label;
        }
      }
    }

    return row as Row;
  }

  /** Every rule gets the whole edited row, so fields can be compared. */
  public validate(): Map<keyof Row & string, string> {
    const row = this.getRow();
    const errors = new Map<keyof Row & string, string>();

    for (const [prop, { editor, config }] of this.fields) {
      // If the options didn't load, there was nothing to pick from.
      const message = this.loadErrors.has(prop)
        ? this.texts.loadFailed
        : validateValue(config, editor.getValue(), row, this.texts);

      if (message !== undefined) {
        errors.set(prop, message);
      }
    }

    return errors;
  }

  /** Replaces whatever errors are currently shown. */
  public showErrors(errors: Map<keyof Row & string, string>): void {
    this.clearErrors();

    for (const [prop, message] of errors) {
      this.showError(prop, message);
    }
  }

  /** Removes every error message and its ARIA attributes. */
  public clearErrors(): void {
    for (const prop of [...this.errors.keys()]) {
      this.hideError(prop);
    }
  }

  /** Moves the cursor to a field. */
  public focus(prop: keyof Row & string): void {
    this.fields.get(prop)?.editor.focus();
  }

  /** Leaves the cells empty; the caller redraws them. Safe to call twice. */
  public destroy(): void {
    this.clearErrors();

    for (const { editor } of this.fields.values()) {
      editor.destroy();
    }

    this.fields.clear();
    this.dependents.clear();
    this.loadErrors.clear();
  }

  /** Shows one message under a field, linked with `aria-describedby`. */
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

  /** Removes one field's message, if there is one. */
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

  /** Country changed: clear region and city, then reload both. */
  private changed(prop: keyof Row & string): void {
    // Starting with `prop` in the set means a dependency loop can't clear
    // what the user just picked.
    const cleared = new Set<keyof Row & string>([prop]);
    this.clearBelow(prop, cleared);
    cleared.delete(prop);

    // Reload only after the whole chain is cleared, so no loader sees a
    // stale value further down.
    for (const field of cleared) {
      void this.loadField(field);
    }
  }

  /**
   * Walks the chain by hand, since `setValue` doesn't fire `onChange`.
   * `cleared` also stops dependency loops.
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

  /** Loads one select's options and shows or hides the load error. */
  private async loadField(prop: keyof Row & string): Promise<void> {
    const field = this.fields.get(prop);

    if (field?.editor.load === undefined) {
      return;
    }

    const result = await field.editor.load(this.getRow() as Record<string, unknown>);

    if (result === 'cancelled') {
      return;
    }

    if (result === 'failed') {
      this.loadErrors.add(prop);
      this.showError(prop, this.texts.loadFailed);
      return;
    }

    if (this.loadErrors.delete(prop)) {
      this.hideError(prop);
    }
  }
}
