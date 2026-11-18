import type { Api } from 'datatables.net';

/** What the current row needs from its table. */
export type CurrentRowParts<Row extends object> = {
  /** The table. */
  readonly dataTable: Api<Row>;
  /** The field that identifies a row. Never missing here: `checkOptions` throws without it. */
  readonly rowId: keyof Row & string;
  /** The user's classes for the highlighted row, already split. */
  readonly classes: readonly string[];
  /** Called with the highlighted row, or `null`, each time it changes. */
  readonly onChange?: (row: Row | null) => void;
};

/**
 * The one highlighted row. Like the selection, the id is the truth and the
 * `<tr>` classes are redrawn from it after every draw. Clicks come from the
 * table, so the click rules stay in one place.
 */
export class CurrentRow<Row extends object> {
  /** The highlighted row's id. `undefined` when none is. */
  private id?: string | number;
  /** What the current row needs from the table. */
  private readonly parts: CurrentRowParts<Row>;

  /** Nothing is highlighted yet. */
  public constructor(parts: CurrentRowParts<Row>) {
    this.parts = parts;
  }

  /** Puts the classes and `aria-current` on the highlighted row of the page, and takes them off the others. */
  public sync(): void {
    const rows = this.parts.dataTable.rows({ page: 'current' });
    const data = rows.data().toArray();

    // Same order as `data`, so `nodes[i]` is the `<tr>` of `data[i]`.
    rows
      .nodes()
      .toArray()
      .forEach((node, index) => {
        const row = data[index];

        if (row === undefined) {
          return;
        }

        const current = this.id !== undefined && this.idFor(row) === this.id;

        for (const name of ['tdb-row-current', ...this.parts.classes]) {
          node.classList.toggle(name, current);
        }

        if (current) {
          node.setAttribute('aria-current', 'true');
        } else {
          node.removeAttribute('aria-current');
        }
      });
  }

  /** The highlighted row, or `undefined`. */
  public get(): Row | undefined {
    if (this.id === undefined) {
      return undefined;
    }

    return this.parts.dataTable
      .rows()
      .data()
      .toArray()
      .find((row) => this.idFor(row) === this.id);
  }

  /** Whether the row with this id is the highlighted one. */
  public has(id: string | number): boolean {
    return this.id === id;
  }

  /**
   * Highlights a row, or nothing with `null`. `onChange` is only called if
   * something changed.
   *
   * @returns `false` if no row has this id. Nothing changes then.
   */
  public set(id: string | number | null): boolean {
    if (id === null) {
      if (this.id !== undefined) {
        this.id = undefined;
        this.sync();
        this.changed();
      }

      return true;
    }

    if (!this.exists(id)) {
      return false;
    }

    if (this.id !== id) {
      this.id = id;
      this.sync();
      this.changed();
    }

    return true;
  }

  /** For clicks: highlights the row, or removes the highlight if it already has it. */
  public toggle(id: string | number): void {
    this.set(this.id === id ? null : id);
  }

  /** Forgets the highlighted row once it left the table, after `setData` or a delete. */
  public prune(): void {
    if (this.id !== undefined && !this.exists(this.id)) {
      this.id = undefined;
      this.changed();
    }
  }

  /** Tells the user the highlight moved. */
  private changed(): void {
    this.parts.onChange?.(this.get() ?? null);
  }

  /** The id of a row. */
  private idFor(row: Row): string | number {
    return row[this.parts.rowId] as string | number;
  }

  /** Whether a row with this id is in the table. */
  private exists(id: string | number): boolean {
    return this.parts.dataTable
      .rows()
      .data()
      .toArray()
      .some((row) => this.idFor(row) === id);
  }
}
