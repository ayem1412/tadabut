import type { Column } from '../columns/column';
import { createEditor } from '../editors/create';
import type { EditorInstance } from '../editors/instance';
import type { AnyValidatedEditor } from '../validation/validate';

/** An editable column, paired with its cell in the row being edited. */
export type EditableCell<Row extends object> = {
  readonly column: Column<Row>;
  readonly cell: HTMLTableCellElement;
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

  private readonly editors: Map<keyof Row & string, EditorInstance<unknown>> = new Map();

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
      const editor = createEditor(column.editor as AnyValidatedEditor, {
        value: this.originalData[column.prop],
        onChange: () => {},
      });

      cell.replaceChildren(editor.element);
      this.editors.set(column.prop, editor);
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

    for (const [prop, editor] of this.editors) {
      row[prop] = editor.getValue();
    }

    // Safe: each editor was created from its column's config, and
    // `Column<Row>` checked that the config fits the column.
    return row as Row;
  }

  /**
   * Destroys every editor. Safe to call more than once.
   *
   * The editable cells are left empty: the caller must put their content
   * back.
   */
  public destroy(): void {
    for (const editor of this.editors.values()) {
      editor.destroy();
    }

    this.editors.clear();
  }
}
