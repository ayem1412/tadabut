import type { Api } from 'datatables.net';
import type { RowScope } from './scope';
import { rowsFor } from './totals';

/** What a selection needs from its table. */
export type SelectionParts<Row extends object> = {
  /** The table. */
  readonly dataTable: Api<Row>;
  /** The field that identifies a row. Never missing here: `checkOptions` throws without it. */
  readonly rowId: keyof Row & string;
  /** Which rows "check all" takes. */
  readonly scope: RowScope;
  /**
   * Rows come one page at a time, so ticked rows on other pages are kept as
   * copies, and leaving the page doesn't unselect them.
   */
  readonly server: boolean;
  /** Called with the selected rows each time the selection changes. */
  readonly onSelect?: (rows: readonly Row[]) => void;
};

/**
 * Which rows are ticked. The map is the truth; the checkboxes on the page
 * are redrawn from it after every draw, since DataTables rebuilds rows.
 */
export class Selection<Row extends object> {
  /** The ticked rows by id, as copies. */
  private readonly rows = new Map<string | number, Row>();
  /** What the selection needs from the table. */
  private readonly parts: SelectionParts<Row>;

  /**
   * Starts listening to the checkboxes. On the wrapper, because a scrolling
   * table puts its header in a table of its own. Nothing is ticked yet.
   */
  public constructor(parts: SelectionParts<Row>) {
    this.parts = parts;
    this.parts.dataTable.table().container().addEventListener('change', this.onChange);
  }

  /**
   * Ticks the checkboxes on the page to match the selection, and sets the
   * header's checkbox to all, none or some. With `server`, also refreshes the
   * copies of the ticked rows on the page. The ticks don't change, so
   * `onSelect` isn't called.
   */
  public sync(): void {
    const rows = this.parts.dataTable.rows({ page: 'current' });
    const data = rows.data().toArray();

    rows
      .nodes()
      .toArray()
      .forEach((node, index) => {
        const row = data[index];

        if (row === undefined) {
          return;
        }

        const id = this.idFor(row);
        const selected = this.rows.has(id);

        if (selected && this.parts.server) {
          this.rows.set(id, { ...row });
        }

        node.classList.toggle('tdb-row-selected', selected);

        const checkbox = node.querySelector<HTMLInputElement>('.tdb-select-row');

        if (checkbox !== null) {
          checkbox.checked = selected;
        }
      });

    const all = this.parts.dataTable
      .table()
      .header()
      .querySelector<HTMLInputElement>('.tdb-select-all');

    if (all === null) {
      return;
    }

    const scope = this.scopeRows();
    const count = scope.filter((row) => this.rows.has(this.idFor(row))).length;

    all.checked = count > 0 && count === scope.length;
    all.indeterminate = count > 0 && count < scope.length;
  }

  /**
   * The selected rows. Rows the search hides, or on other pages, are in it
   * too. In the order they were added to the table, or with `server`, in the
   * order they were ticked.
   */
  public selected(): Row[] {
    if (this.parts.server) {
      return [...this.rows.values()];
    }

    return this.parts.dataTable
      .rows()
      .data()
      .toArray()
      .filter((row) => this.rows.has(this.idFor(row)));
  }

  /** Whether the row with this id is selected. */
  public has(id: string | number): boolean {
    return this.rows.has(id);
  }

  /**
   * Selects or unselects rows. Ids of rows that aren't in the table are
   * skipped. `onSelect` is only called if something changed.
   */
  public set(ids: readonly (string | number)[], selected: boolean): void {
    const before = this.rows.size;

    if (selected) {
      const loaded = this.loadedRows();

      for (const id of ids) {
        const row = loaded.get(id);

        if (row !== undefined) {
          this.rows.set(id, { ...row });
        }
      }
    } else {
      for (const id of ids) {
        this.rows.delete(id);
      }
    }

    // Only adds or only removes, so the same size means nothing changed.
    if (this.rows.size !== before) {
      this.sync();
      this.changed();
    }
  }

  /** Unselects every row. */
  public clear(): void {
    if (this.rows.size === 0) {
      return;
    }

    this.rows.clear();
    this.sync();
    this.changed();
  }

  /**
   * Forgets rows that left the table, after `setData` or a delete. Not with
   * `server`, where a row missing from the page is only on another page.
   */
  public prune(): void {
    if (this.parts.server) {
      return;
    }

    const loaded = this.loadedRows();
    const before = this.rows.size;

    for (const id of [...this.rows.keys()]) {
      if (!loaded.has(id)) {
        this.rows.delete(id);
      }
    }

    if (this.rows.size !== before) {
      this.sync();
      this.changed();
    }
  }

  /** Unselects a deleted row. */
  public forget(id: string | number): void {
    if (this.rows.delete(id)) {
      this.sync();
      this.changed();
    }
  }

  /**
   * Keeps a selected row's copy up to date after a save. The ticks don't
   * change, so `onSelect` isn't called.
   */
  public update(row: Row): void {
    const id = this.idFor(row);

    if (this.rows.has(id)) {
      this.rows.set(id, { ...row });
    }
  }

  /** Stops listening to the checkboxes. */
  public destroy(): void {
    this.parts.dataTable.table().container().removeEventListener('change', this.onChange);
  }

  /** Tells the user the selection changed. */
  private changed(): void {
    this.parts.onSelect?.(this.selected());
  }

  /** The id of a row. */
  private idFor(row: Row): string | number {
    return row[this.parts.rowId] as string | number;
  }

  /** Every row DataTables has, by id. With `server`, only the page. */
  private loadedRows(): Map<string | number, Row> {
    const rows = this.parts.dataTable.rows().data().toArray();

    return new Map(rows.map((row) => [this.idFor(row), row]));
  }

  /** The row an element is in, or `undefined` outside DataTables' rows. */
  private rowOf(element: Element): Row | undefined {
    const tr = element.closest('tr');

    if (tr === null) {
      return undefined;
    }

    const row = this.parts.dataTable.row(tr);

    return row.any() ? row.data() : undefined;
  }

  /** The rows in `scope`. */
  private scopeRows(): Row[] {
    return this.parts.dataTable.rows(rowsFor(this.parts.scope)).data().toArray();
  }

  /** Ticks or unticks one row. */
  private toggle(row: Row, selected: boolean): void {
    if (selected) {
      this.rows.set(this.idFor(row), { ...row });
    } else {
      this.rows.delete(this.idFor(row));
    }
  }

  /**
   * A row's checkbox or the header's was clicked. An arrow function, so
   * `destroy` can remove it.
   */
  private readonly onChange = (event: Event): void => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.classList.contains('tdb-select-row')) {
      const row = this.rowOf(target);

      if (row === undefined) {
        return;
      }

      this.toggle(row, target.checked);
    } else if (target.classList.contains('tdb-select-all')) {
      if (target.closest('thead') !== this.parts.dataTable.table().header()) {
        return;
      }

      for (const row of this.scopeRows()) {
        this.toggle(row, target.checked);
      }
    } else {
      // An editor's input in an edited row.
      return;
    }

    this.sync();
    this.changed();
  };
}
