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
  /** Called with the selected rows each time the selection changes. */
  readonly onSelect?: (rows: readonly Row[]) => void;
};

/**
 * Which rows are ticked. The ids are the truth; the checkboxes on the page
 * are redrawn from them after every draw, since DataTables rebuilds rows.
 */
export class Selection<Row extends object> {
  /** The selected row ids. */
  private readonly ids = new Set<string | number>();
  /** What the selection needs from the table. */
  private readonly parts: SelectionParts<Row>;

  /** Starts listening to the checkboxes. Nothing is ticked yet. */
  public constructor(parts: SelectionParts<Row>) {
    this.parts = parts;
    this.parts.dataTable.table().node().addEventListener('change', this.onChange);
  }

  /**
   * Ticks the checkboxes on the page to match the selection, and sets the
   * header's checkbox to all, none or some.
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

        const selected = this.ids.has(this.idFor(row));
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

    const scope = this.scopeIds();
    const count = scope.filter((id) => this.ids.has(id)).length;

    all.checked = count > 0 && count === scope.length;
    all.indeterminate = count > 0 && count < scope.length;
  }

  /**
   * The selected rows, in the order they were added to the table. Rows the
   * search hides, or on other pages, are in it too.
   */
  public selected(): Row[] {
    return this.parts.dataTable
      .rows()
      .data()
      .toArray()
      .filter((row) => this.ids.has(this.idFor(row)));
  }

  /** Whether the row with this id is selected. */
  public has(id: string | number): boolean {
    return this.ids.has(id);
  }

  /**
   * Selects or unselects rows. Ids of rows that aren't in the table are
   * skipped. `onSelect` is only called if something changed.
   */
  public set(ids: readonly (string | number)[], selected: boolean): void {
    const before = this.ids.size;

    if (selected) {
      const existing = this.allIds();

      for (const id of ids) {
        if (existing.has(id)) {
          this.ids.add(id);
        }
      }
    } else {
      for (const id of ids) {
        this.ids.delete(id);
      }
    }

    // Only adds or only removes, so the same size means nothing changed.
    if (this.ids.size !== before) {
      this.sync();
      this.changed();
    }
  }

  /** Unselects every row. */
  public clear(): void {
    if (this.ids.size === 0) {
      return;
    }

    this.ids.clear();
    this.sync();
    this.changed();
  }

  /** Forgets the ids of rows that left the table, after `setData` or a delete. */
  public prune(): void {
    const existing = this.allIds();
    const before = this.ids.size;

    for (const id of this.ids) {
      if (!existing.has(id)) {
        this.ids.delete(id);
      }
    }

    if (this.ids.size !== before) {
      this.sync();
      this.changed();
    }
  }

  /** Stops listening to the checkboxes. */
  public destroy(): void {
    this.parts.dataTable.table().node().removeEventListener('change', this.onChange);
  }

  /** Tells the user the selection changed. */
  private changed(): void {
    this.parts.onSelect?.(this.selected());
  }

  /** The id of a row. */
  private idFor(row: Row): string | number {
    return row[this.parts.rowId] as string | number;
  }

  /** The ids of every row in the table. */
  private allIds(): Set<string | number> {
    return new Set(
      this.parts.dataTable
        .rows()
        .data()
        .toArray()
        .map((row) => this.idFor(row)),
    );
  }

  /** The id of the row an element is in, or `undefined` outside DataTables' rows. */
  private idOf(element: Element): string | number | undefined {
    const tr = element.closest('tr');

    if (tr === null) {
      return undefined;
    }

    const row = this.parts.dataTable.row(tr);

    return row.any() ? this.idFor(row.data()) : undefined;
  }

  /** The ids of the rows in `scope`. */
  private scopeIds(): (string | number)[] {
    return this.parts.dataTable
      .rows(rowsFor(this.parts.scope))
      .data()
      .toArray()
      .map((row) => this.idFor(row));
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
      const id = this.idOf(target);

      if (id === undefined) {
        return;
      }

      if (target.checked) {
        this.ids.add(id);
      } else {
        this.ids.delete(id);
      }
    } else if (target.classList.contains('tdb-select-all')) {
      for (const id of this.scopeIds()) {
        if (target.checked) {
          this.ids.add(id);
        } else {
          this.ids.delete(id);
        }
      }
    } else {
      // An editor's input in an edited row.
      return;
    }

    this.sync();
    this.changed();
  };
}
