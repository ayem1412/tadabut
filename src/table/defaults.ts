import type { TadabutOptions } from './options';

/**
 * The options that don't depend on the rows, so many tables can share them
 * through `Tadabut.extend`.
 */
export type DefaultOptions = Pick<
  TadabutOptions<object>,
  | 'texts'
  | 'classNames'
  | 'icons'
  | 'dataTables'
  | 'editing'
  | 'editable'
  | 'totalRows'
  | 'selection'
  | 'currentRow'
> & {
  /** `false` deletes without asking, on every table. A function would need the page's rows. */
  readonly confirmDelete?: false;
};

/** Drops the keys whose value is `undefined`, so `texts={undefined}` doesn't wipe a default. */
function withoutUndefined<T extends object>(values: T): Partial<T> {
  const kept = Object.entries(values).filter(([, value]) => value !== undefined);

  return Object.fromEntries(kept) as Partial<T>;
}

/** Two objects key by key, `over` winning. `undefined` when both are. */
function mergeObject<T extends object>(base: T | undefined, over: T | undefined): T | undefined {
  if (base === undefined && over === undefined) {
    return undefined;
  }

  return { ...base, ...withoutUndefined(over ?? {}) } as T;
}

/**
 * `given` on top of `base`. `texts`, `classNames`, `icons`, `editing` and
 * `dataTables` combine key by key, and so does `dataTables.language` when both
 * are objects. Anything else in `given` replaces what's in `base`.
 */
export function mergeOptions<Options extends object>(
  base: DefaultOptions,
  given: Options,
): Options {
  // Only the shared options are read. A page's `confirmDelete` can be a function, which is fine.
  const over = given as DefaultOptions;
  const dataTables = mergeObject(base.dataTables, over.dataTables);
  const baseLanguage = base.dataTables?.language;
  const overLanguage = over.dataTables?.language;

  return {
    ...base,
    ...withoutUndefined(given),
    texts: mergeObject(base.texts, over.texts),
    classNames: mergeObject(base.classNames, over.classNames),
    icons: mergeObject(base.icons, over.icons),
    editing: mergeObject(base.editing, over.editing),
    dataTables:
      // Only two objects combine: a page's `language: { url }` simply replaces it.
      typeof baseLanguage === 'object' && typeof overLanguage === 'object'
        ? { ...dataTables, language: mergeObject(baseLanguage, overLanguage) }
        : dataTables,
  } as Options;
}
