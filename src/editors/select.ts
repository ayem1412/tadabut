import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

/** One choice in a select. */
export type SelectOption<Value> = {
  /** What the user sees. */
  readonly label: string;
  /** What gets saved in the row. */
  readonly value: Value;
};

/** The second argument of an `options` function. */
export type OptionsContext = {
  /**
   * Aborted when the result isn't needed anymore (the field above changed
   * again, or the row closed). Pass it to `fetch`.
   */
  readonly signal: AbortSignal;
};

/** Can return the list directly or a promise of it. */
export type SelectOptionsLoader<Value, Row> = (
  row: Row,
  context: OptionsContext,
) => readonly SelectOption<Value>[] | Promise<readonly SelectOption<Value>[]>;

/** Fields that hold a string, so they can store a label. */
type TextKeys<Row> = {
  [Key in keyof Row]: Row[Key] extends string | null | undefined ? Key : never;
}[keyof Row] &
  string;

/**
 * A dropdown for `string`, `number` or `boolean` columns. Option values must
 * have the column's type (`1`, not `'1'`). A value that matches no option
 * gives `null`.
 *
 * `options` is a list, or a function of the row. With a function you can set
 * `dependsOn`: when that field changes, this select is cleared and reloaded.
 *
 * @example
 * { type: 'select', options: [{ value: 1, label: 'Morocco' }] }
 *
 * {
 *   type: 'select',
 *   dependsOn: 'countryId',
 *   labelProp: 'cityName',
 *   options: (row, { signal }) => fetchCities(row.countryId, signal),
 * }
 */
export type SelectEditor<Value, Row> = BaseEditor & {
  /** Picks this editor. */
  readonly type: 'select';
  /**
   * Where to save the picked label, like `'cityName'`. The cell shows that
   * field too. While options are loading, the old label is kept.
   */
  readonly labelProp?: TextKeys<Row>;
} & (
    | {
        /** The choices, in order. */
        readonly options: readonly SelectOption<Value>[];
        /** Only allowed when `options` is a function. */
        readonly dependsOn?: never;
      }
    | {
        /** Gives the choices for the open row. */
        readonly options: SelectOptionsLoader<Value, Row>;
        /** When this field changes, the select is cleared and `options` runs again. */
        readonly dependsOn?: keyof Row & string;
      }
  );

/** `'cancelled'`: a newer load started (or the editor was destroyed) first. */
export type LoadResult = 'loaded' | 'failed' | 'cancelled';

/** A live select: an editor, plus `load` and `getLabel`. */
export type SelectInstance<Value, Row> = EditorInstance<Value | null> & {
  /** Cancels any load still running. Resolves at once for a fixed list. */
  readonly load: (row: Row) => Promise<LoadResult>;
  /** `null` when nothing is picked, `undefined` while options aren't loaded. */
  readonly getLabel: () => string | null | undefined;
};

/**
 * `<option>` values are always strings, so the picked value is looked up by
 * index to keep its real type. Until a loader's options arrive, the starting
 * value is kept in `current`.
 */
export function createSelectEditor<Value, Row>(
  config: SelectEditor<Value, Row>,
  context: EditorContext<Value | null>,
): SelectInstance<Value, Row> {
  const select = document.createElement('select');
  addClasses(select, ['tdb-input', 'tdb-input-select'], context.className);

  /** The options on screen. Empty while a loader runs. */
  let options: readonly SelectOption<Value>[] = [];

  /** The value, kept even while there are no options to pick it from. */
  let current: Value | null = context.value;

  /** The running load, so a newer one or `destroy` can abort it. */
  let controller: AbortController | undefined;

  /** Selects `current`. A value that isn't in the list becomes `null`. */
  const pickCurrent = (): void => {
    select.selectedIndex = options.findIndex((option) => option.value === current);

    if (select.selectedIndex === -1) {
      current = null;
    }
  };

  /** Shows `list`, enables the select and picks `current`. */
  const fill = (list: readonly SelectOption<Value>[]): void => {
    options = list;
    select.replaceChildren(
      ...list.map((option) => {
        const element = document.createElement('option');
        element.textContent = option.label;
        return element;
      }),
    );
    select.disabled = false;
    pickCurrent();
  };

  /** Shows a single disabled line, like "Loading…". */
  const showOnly = (text: string): void => {
    options = [];
    const element = document.createElement('option');
    element.textContent = text;
    select.replaceChildren(element);
    select.disabled = true;
  };

  /** Runs the `options` function and shows its result. */
  const load = async (row: Row): Promise<LoadResult> => {
    if (typeof config.options !== 'function') {
      return 'loaded';
    }

    controller?.abort();
    const own = new AbortController();
    controller = own;

    try {
      const result = config.options(row, { signal: own.signal });

      // Sync loaders skip the "Loading…" flash.
      if (!(result instanceof Promise)) {
        fill(result);
        return 'loaded';
      }

      showOnly('Loading…');
      const list = await result;

      // Ignore late answers even if the loader didn't use the signal.
      if (own.signal.aborted) {
        return 'cancelled';
      }

      fill(list);
      return 'loaded';
    } catch {
      if (own.signal.aborted) {
        return 'cancelled';
      }

      showOnly('');
      return 'failed';
    }
  };

  /** The value, even while options are loading. */
  const getValue = (): Value | null => current;

  /** `undefined` while options aren't loaded. */
  const getLabel = (): string | null | undefined =>
    current === null ? null : options.find((option) => option.value === current)?.label;

  /** While loading, the value is only remembered. */
  const setValue = (value: Value | null): void => {
    current = value;

    if (!select.disabled) {
      pickCurrent();
    }
  };

  if (typeof config.options !== 'function') {
    fill(config.options);
  }

  select.addEventListener('change', () => {
    current = options[select.selectedIndex]?.value ?? null;
    context.onChange(current);
  });

  return {
    element: select,
    getValue,
    getLabel,
    setValue,
    load,
    focus: () => select.focus(),
    destroy: () => {
      controller?.abort();
      select.remove();
    },
  };
}
