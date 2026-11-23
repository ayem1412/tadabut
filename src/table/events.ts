import type { SaveContext } from './options';

/**
 * What `table.on()` can listen to, and the arguments each listener gets: the
 * same as the matching `on…` option.
 */
export type TadabutEvents<Row extends object> = {
  /** A save worked and the row closed: the row as it is now, and the row before editing. */
  readonly saved: readonly [row: Row, context: SaveContext<Row>];
  /** A new row joined the table, as saved. */
  readonly added: readonly [row: Row];
  /** A row left the table after `onDelete`. */
  readonly deleted: readonly [row: Row];
  /** The ticked rows changed, by a click or from code. */
  readonly select: readonly [rows: readonly Row[]];
  /** The highlight moved. `null` when no row is highlighted anymore. */
  readonly currentChange: readonly [row: Row | null];
  /** A row was clicked, with the same rules as `onRowClick`. */
  readonly rowClick: readonly [row: Row, event: MouseEvent];
  /** A row was double-clicked, with the same rules as `onRowDoubleClick`. */
  readonly rowDoubleClick: readonly [row: Row, event: MouseEvent];
};

/** The name of an event, like `'saved'`. */
export type TadabutEventName = keyof TadabutEvents<object>;

/** A function `on` calls with that event's arguments. */
export type TadabutListener<Row extends object, Name extends TadabutEventName> = (
  ...args: TadabutEvents<Row>[Name]
) => void;

/** The listeners of one table, by event. */
export class Listeners<Row extends object> {
  /**
   * A `Set`, so the same function added twice runs once, like
   * `addEventListener`. `unknown`: one map holds every event's functions, and
   * the typed methods keep them apart.
   */
  private readonly byName = new Map<TadabutEventName, Set<unknown>>();

  /** Adds a listener. Returns a function that removes it. */
  public on<Name extends TadabutEventName>(
    name: Name,
    listener: TadabutListener<Row, Name>,
  ): () => void {
    let listeners = this.byName.get(name);

    if (listeners === undefined) {
      listeners = new Set();
      this.byName.set(name, listeners);
    }

    listeners.add(listener);

    return () => this.off(name, listener);
  }

  /** Removes a listener added with `on`. It must be the same function. */
  public off<Name extends TadabutEventName>(
    name: Name,
    listener: TadabutListener<Row, Name>,
  ): void {
    this.byName.get(name)?.delete(listener);
  }

  /** Calls every listener of `name`, in the order they were added. One that throws doesn't stop the others. */
  public emit<Name extends TadabutEventName>(name: Name, ...args: TadabutEvents<Row>[Name]): void {
    const listeners = this.byName.get(name);

    if (listeners === undefined) {
      return;
    }

    // A copy: a listener may remove itself, or another, while this runs.
    for (const listener of [...listeners] as TadabutListener<Row, Name>[]) {
      try {
        listener(...args);
      } catch (error) {
        report(error);
      }
    }
  }

  /** Removes every listener. */
  public clear(): void {
    this.byName.clear();
  }
}

/** Shows an error like an uncaught one, without stopping what called it. */
function report(error: unknown): void {
  // jsdom, which the tests run in, has no reportError.
  if (typeof reportError === 'function') {
    reportError(error);
  } else {
    console.error(error);
  }
}
