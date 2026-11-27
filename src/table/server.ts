import type { AjaxCallback, AjaxData, AjaxResponse } from 'datatables.net';
import type { Column } from '../columns/column';
import type { ServerFunction, ServerRequest, ServerResponse } from './options';

/** What the server source needs from its table. */
export type ServerParts<Row extends object> = {
  /** The user's `server` function. */
  readonly server: ServerFunction<Row>;
  /** The user's columns, to turn DataTables' column numbers into fields. */
  readonly columns: readonly Column<Row>[];
  /** How many columns Tadabut adds before the user's: the checkboxes and the ▸ button. */
  readonly offset: number;
  /** Called right before new rows replace the old ones. */
  readonly onRows: () => void;
  /** Called when loading failed, with the error's message, or `undefined` if it wasn't an `Error`. */
  readonly onError: (message: string | undefined) => void;
  /** Called after rows loaded fine. */
  readonly onLoaded: () => void;
  /** The rows the table shows now, saves included. */
  readonly shownRows: () => readonly Row[];
};

/** Loads the rows from the user's `server` function, one page at a time. */
export class ServerSource<Row extends object> {
  /** What the source needs from the table. */
  private readonly parts: ServerParts<Row>;
  /** Stops the request in progress, when a newer one starts or the table goes away. */
  private controller?: AbortController;
  /** The last good reply. Its counts are used again when a load fails. */
  private lastReply: AjaxResponse = { data: [], recordsFiltered: 0, recordsTotal: 0 };
  /** The totals of the last good reply. */
  private lastTotals: NonNullable<ServerResponse<Row>['totals']> = {};

  /** Nothing loads until DataTables calls `ajax`. */
  public constructor(parts: ServerParts<Row>) {
    this.parts = parts;
  }

  /** The totals the server sent with the last good reply. */
  public get totals(): NonNullable<ServerResponse<Row>['totals']> {
    return this.lastTotals;
  }

  /**
   * DataTables calls this each time it needs rows: paging, sorting, search,
   * `reload()`. An arrow function, so it can be given to DataTables as is.
   */
  public readonly ajax = (data: AjaxData, callback: AjaxCallback): void => {
    this.controller?.abort();

    const controller = new AbortController();
    this.controller = controller;

    void this.load(data, callback, controller);
  };

  /** Stops the request in progress, if any. */
  public abort(): void {
    this.controller?.abort();
  }

  /** Asks the server, then hands its rows to DataTables. */
  private async load(
    data: AjaxData,
    callback: AjaxCallback,
    controller: AbortController,
  ): Promise<void> {
    let reply: ServerResponse<Row>;

    try {
      reply = await this.parts.server(this.toRequest(data), { signal: controller.signal });
    } catch (error) {
      // `server` may throw before it returns a promise. On the first load the
      // table's constructor is still running then: waiting lets it finish.
      await Promise.resolve();

      // A newer request replaced this one, or the table went away: it isn't an error.
      if (controller.signal.aborted) {
        return;
      }

      // The rows shown come back, saves included, so "Processing…" goes away.
      // The page number at the bottom already moved to the page that failed:
      // DataTables moves it before asking. The next good reply fixes it.
      this.parts.onRows();
      callback({
        ...this.lastReply,
        draw: data.draw,
        data: this.parts.shownRows().map((row) => ({ ...row })),
      });
      this.parts.onError(error instanceof Error ? error.message : undefined);

      return;
    }

    // The function may ignore the signal and answer late: a newer request owns the table.
    if (controller.signal.aborted) {
      return;
    }

    this.lastTotals = reply.totals ?? {};
    this.lastReply = {
      data: reply.rows.map((row) => ({ ...row })),
      recordsFiltered: reply.count,
      recordsTotal: reply.countAll ?? reply.count,
    };

    // Before the callback, which replaces the rows.
    this.parts.onRows();
    // `draw` goes back as it came: DataTables uses it to drop old replies.
    callback({ ...this.lastReply, draw: data.draw });
    this.parts.onLoaded();
  }

  /** DataTables' request, with fields instead of column numbers. */
  private toRequest(data: AjaxData): ServerRequest<Row> {
    const order: ServerRequest<Row>['order'][number][] = [];

    for (const entry of data.order ?? []) {
      // The checkbox, ▸ and buttons columns aren't the user's.
      const column = this.parts.columns[entry.column - this.parts.offset];

      if (column !== undefined) {
        order.push({ prop: column.prop, dir: entry.dir === 'desc' ? 'desc' : 'asc' });
      }
    }

    return {
      start: data.start ?? 0,
      length: data.length ?? -1,
      order,
      search: data.search?.value ?? '',
    };
  }
}
