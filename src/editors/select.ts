import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';

/**
 * One choice in a select.
 *
 * @typeParam Value - The column's value type.
 */
export type SelectOption<Value> = {
  /** Text shown to the user. */
  readonly label: string;
  /** Value saved in the row when this choice is picked. */
  readonly value: Value;
};

/**
 * What a select's `options` function gets next to the row.
 */
export type OptionsContext = {
  /**
   * Aborted when the options aren't needed anymore: the field it depends on
   * changed again, or the row was closed. Pass it to `fetch` so old requests
   * stop.
   */
  readonly signal: AbortSignal;
};

/**
 * A select's options as a function of the row. It can return the list right
 * away, or a promise of it.
 *
 * @typeParam Value - The column's value type.
 * @typeParam Row - The shape of one row.
 */
export type SelectOptionsLoader<Value, Row> = (
  row: Row,
  context: OptionsContext,
) => readonly SelectOption<Value>[] | Promise<readonly SelectOption<Value>[]>;

/**
 * A dropdown list. Works for `string`, `number` and `boolean` columns.
 *
 * Option values must have the same type as the column: a `number` column
 * needs `value: 1`, not `value: '1'`.
 *
 * When the row's value matches no option (or is `null`), nothing is picked
 * and the editor gives `null`.
 *
 * `options` is either a fixed list, or a function of the row. Only a
 * function can have `dependsOn`: when that field changes, this select is
 * cleared and its options load again.
 *
 * @typeParam Value - The column's value type.
 * @typeParam Row - The shape of one row.
 *
 * @example
 * // A fixed list
 * { type: 'select', options: [{ value: 1, label: 'Morocco' }] }
 *
 * // Options that depend on another field
 * {
 *   type: 'select',
 *   dependsOn: 'countryId',
 *   options: (row, { signal }) => fetchCities(row.countryId, signal),
 * }
 */
export type SelectEditor<Value, Row> = BaseEditor & {
  readonly type: 'select';
} & (
    | {
        /** The choices, in the order they are shown. */
        readonly options: readonly SelectOption<Value>[];
        /** Only allowed when `options` is a function. */
        readonly dependsOn?: never;
      }
    | {
        /** Gives the choices for the row being edited. */
        readonly options: SelectOptionsLoader<Value, Row>;
        /**
         * Another field of the row. When it changes, this select is cleared
         * and `options` runs again.
         */
        readonly dependsOn?: keyof Row & string;
      }
  );

/**
 * How a load ended.
 *
 * - `'loaded'`: the options are shown.
 * - `'failed'`: `options` threw. The select stays empty and disabled.
 * - `'cancelled'`: a newer load started, or the editor was destroyed, before
 *   this one ended. Its answer was thrown away.
 */
export type LoadResult = 'loaded' | 'failed' | 'cancelled';

/**
 * A live select editor: the usual editor, plus `load`.
 *
 * @typeParam Value - The column's value type.
 * @typeParam Row - The shape of one row.
 */
export type SelectInstance<Value, Row> = EditorInstance<Value | null> & {
  /**
   * Gets the options for `row` from the `options` function, and shows them.
   * Stops the load before it, if it's still running.
   *
   * With a fixed list, there is nothing to load: it gives `'loaded'` right
   * away.
   */
  readonly load: (row: Row) => Promise<LoadResult>;
};

/**
 * Creates a live select editor.
 *
 * Internal: Tadabut calls it when a row starts being edited.
 *
 * HTML `<option>` values are always strings, so the picked value is read
 * from the options list by position, which keeps its real type (`1`, not
 * `'1'`).
 *
 * With an `options` function, the select starts empty and Tadabut calls
 * `load`. Until the options arrive, the starting value is remembered:
 * `getValue` gives it, and it's picked once the options are shown.
 *
 * @param config The editor config from the column.
 * @param context The starting value, the classes and the change callback.
 */
export function createSelectEditor<Value, Row>(
  config: SelectEditor<Value, Row>,
  context: EditorContext<Value | null>,
): SelectInstance<Value, Row> {
  const select = document.createElement('select');
  addClasses(select, ['tdb-input', 'tdb-input-select'], context.className);

  /** The options shown now. Empty until a function's options arrive. */
  let options: readonly SelectOption<Value>[] = [];

  /**
   * The value, kept here and not only in the `<select>`: while options are
   * loading, the `<select>` has nothing to pick, but the value must not be
   * lost.
   */
  let current: Value | null = context.value;

  /** The load that's running, so a newer one (or destroy) can stop it. */
  let controller: AbortController | undefined;

  /** Picks `current` in the `<select>`. If it's not in the list, it's `null`. */
  const pickCurrent = (): void => {
    select.selectedIndex = options.findIndex((option) => option.value === current);

    if (select.selectedIndex === -1) {
      current = null;
    }
  };

  /** Replaces the `<option>`s with `list`, enables the select and picks `current`. */
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

  /** Shows one disabled, unpickable line, like "Loading…". */
  const showOnly = (text: string): void => {
    options = [];
    const element = document.createElement('option');
    element.textContent = text;
    select.replaceChildren(element);
    select.disabled = true;
  };

  const load = async (row: Row): Promise<LoadResult> => {
    if (typeof config.options !== 'function') {
      return 'loaded';
    }

    controller?.abort();
    const own = new AbortController();
    controller = own;

    try {
      const result = config.options(row, { signal: own.signal });

      if (!(result instanceof Promise)) {
        fill(result);
        return 'loaded';
      }

      showOnly('Loading…');
      const list = await result;

      // A newer load started, or the editor is gone: this answer is too late.
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

  const getValue = (): Value | null => current;

  const setValue = (value: Value | null): void => {
    current = value;

    // While loading, the value is only remembered: it's picked once the options arrive.
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
    setValue,
    load,
    focus: () => select.focus(),
    destroy: () => {
      controller?.abort();
      select.remove();
    },
  };
}
