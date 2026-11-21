import type { Api, ApiRowMethods } from 'datatables.net';

import type { Texts } from '../texts/texts';
import { rowErrorMessage, setDetailToggle } from './elements';
import type { ButtonIcons, DetailContent, DetailContext } from './options';

/** What the lines under the rows need from the table. */
export type RowLinesParts<Row extends object> = {
  /** The table. */
  readonly dataTable: Api<Row>;
  /** The field that identifies a row. Without it, nothing can be shown. */
  readonly rowId?: keyof Row & string;
  /** The user's `detail`, if any. */
  readonly detail?: (row: Row, context: DetailContext) => DetailContent | Promise<DetailContent>;
  /** The table's texts. */
  readonly texts: Texts;
  /** The user's button icons, for the ▸ button. */
  readonly icons: ButtonIcons;
};

/** A detail that's open, or loading. */
type OpenDetail = {
  /** Its line under the row. */
  readonly line: HTMLTableRowElement;
  /** Aborted when it closes, so a load still running stops. */
  readonly controller: AbortController;
};

/**
 * The lines under each row: its detail and its error. DataTables only allows
 * one set of lines per row, so both live here and are put back together each
 * time one changes.
 */
export class RowLines<Row extends object> {
  /** The open details, by row id. */
  private readonly details = new Map<string | number, OpenDetail>();
  /** The error lines, by row id. */
  private readonly errors = new Map<string | number, HTMLTableRowElement>();
  /** What the lines need from the table. */
  private readonly parts: RowLinesParts<Row>;

  /** Nothing is shown until a detail opens or an error comes. */
  public constructor(parts: RowLinesParts<Row>) {
    this.parts = parts;
  }

  /** Whether a row's detail is open. */
  public isOpen(id: string | number): boolean {
    return this.details.has(id);
  }

  /**
   * Opens a row's detail. "Loading…" shows until `detail` returns. Does
   * nothing without `detail`, if it's open already, or if the row isn't in
   * the table.
   */
  public open(id: string | number): void {
    const detail = this.parts.detail;
    const row = this.findRow(id);

    if (detail === undefined || row === undefined || this.isOpen(id)) {
      return;
    }

    const cell = document.createElement('div');
    cell.textContent = this.parts.texts.detailLoading;

    const controller = new AbortController();
    this.details.set(id, { line: this.line('tdb-row-detail', cell), controller });
    this.render(id);

    void this.load(detail, row.data(), cell, controller);
  }

  /** Closes a row's detail, and stops its load if it's still running. */
  public close(id: string | number): void {
    const open = this.details.get(id);

    if (open === undefined) {
      return;
    }

    open.controller.abort();
    this.details.delete(id);
    this.render(id);
  }

  /** Opens a closed detail, closes an open one. */
  public toggle(id: string | number): void {
    if (this.isOpen(id)) {
      this.close(id);
    } else {
      this.open(id);
    }
  }

  /** Runs an open detail's `detail` again, after a save. Leaves a closed one closed. */
  public reload(id: string | number): void {
    if (this.isOpen(id)) {
      this.close(id);
      this.open(id);
    }
  }

  /** Shows an error under a row, under its detail if open. Replaces the previous one. */
  public showError(id: string | number, message: string): void {
    this.errors.set(id, this.line('tdb-row-error', rowErrorMessage(message)));
    this.render(id);
  }

  /** Removes a row's error, if any. */
  public clearError(id: string | number): void {
    if (this.errors.delete(id)) {
      this.render(id);
    }
  }

  /**
   * Sets the ▸ buttons and the `tdb-detail-open` class on the rows shown.
   * Runs after each draw, since redrawing a row brings back a closed ▸.
   */
  public sync(): void {
    const rowId = this.parts.rowId;

    if (rowId === undefined) {
      return;
    }

    const { texts, icons } = this.parts;
    const rows = this.parts.dataTable.rows({ page: 'current' });
    const data = rows.data().toArray();

    // Same order as `data`, so `nodes[i]` is the `<tr>` of `data[i]`.
    rows
      .nodes()
      .toArray()
      .forEach((tr, index) => {
        const row = data[index];

        if (row === undefined) {
          return;
        }

        const open = this.details.has(row[rowId] as string | number);
        tr.classList.toggle('tdb-detail-open', open);

        const button = tr.querySelector<HTMLButtonElement>('.tdb-detail-toggle');

        if (button !== null) {
          setDetailToggle(button, open, texts, icons);
        }
      });
  }

  /**
   * Forgets the details and errors of rows that left the table, after
   * `setData` or a delete. Their lines left with them.
   */
  public prune(): void {
    const rowId = this.parts.rowId;

    if (rowId === undefined) {
      return;
    }

    const existing = new Set(
      this.parts.dataTable
        .rows()
        .data()
        .toArray()
        .map((row) => row[rowId] as string | number),
    );

    for (const [id, open] of this.details) {
      if (!existing.has(id)) {
        open.controller.abort();
        this.details.delete(id);
      }
    }

    for (const id of this.errors.keys()) {
      if (!existing.has(id)) {
        this.errors.delete(id);
      }
    }
  }

  /** Stops every load still running, and forgets everything. */
  public destroy(): void {
    for (const open of this.details.values()) {
      open.controller.abort();
    }

    this.details.clear();
    this.errors.clear();
  }

  /** The row with this id, or `undefined`. */
  private findRow(id: string | number): ApiRowMethods<Row> | undefined {
    const rowId = this.parts.rowId;

    if (rowId === undefined) {
      return undefined;
    }

    const row = this.parts.dataTable.row((_index, data) => data[rowId] === id);

    return row.any() ? row : undefined;
  }

  /** Waits for `detail`, then puts what it gave, or its error, in the line. */
  private async load(
    detail: NonNullable<RowLinesParts<Row>['detail']>,
    row: Row,
    cell: HTMLDivElement,
    controller: AbortController,
  ): Promise<void> {
    try {
      const content = await detail(row, { signal: controller.signal });

      // Closed, reloaded or destroyed while it loaded.
      if (controller.signal.aborted) {
        return;
      }

      if (typeof content === 'string') {
        cell.textContent = content;
      } else {
        cell.replaceChildren(content);
      }
    } catch (error) {
      // An aborted fetch throws too.
      if (controller.signal.aborted) {
        return;
      }

      cell.replaceChildren(
        rowErrorMessage(error instanceof Error ? error.message : this.parts.texts.detailFailed),
      );
    }
  }

  /** A line under a row: one cell as wide as the table. */
  private line(className: string, content: Node): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.className = className;

    const td = document.createElement('td');
    td.colSpan = this.parts.dataTable.columns(':visible').count();
    td.append(content);
    tr.append(td);

    return tr;
  }

  /**
   * Puts the row's lines back under it: its detail, then its error. With
   * neither, the lines are removed.
   */
  private render(id: string | number): void {
    const row = this.findRow(id);

    if (row === undefined) {
      return;
    }

    const lines = [this.details.get(id)?.line, this.errors.get(id)].filter(
      (line) => line !== undefined,
    );

    if (lines.length === 0) {
      row.child.remove();
    } else {
      // DataTables takes an array of `<tr>`s, but its types forgot elements in arrays.
      row.child(lines as unknown as Node).show();
    }

    this.sync();
  }
}
