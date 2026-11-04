/**
 * Every text Tadabut shows by itself. DataTables' own texts (search, paging…)
 * go in `dataTables.language` instead.
 *
 * The ones that include a number or a date are functions, so each language
 * can put it where its grammar wants.
 */
export type Texts = {
  /** The Edit button. */
  readonly edit: string;
  /** The Save button. */
  readonly save: string;
  /** The Cancel button. */
  readonly cancel: string;
  /** Shown in a select while its options load. */
  readonly loading: string;
  /** Under a row when `onSave` throws something that isn't an `Error`. */
  readonly saveFailed: string;
  /** Under a select whose options failed to load. */
  readonly loadFailed: string;
  /** An empty field with `required`. */
  readonly required: string;
  /** A text that doesn't match `pattern`. */
  readonly patternMismatch: string;
  /** A text shorter than `minLength`. */
  readonly tooShort: (min: number) => string;
  /** A text longer than `maxLength`. */
  readonly tooLong: (max: number) => string;
  /** A number below `min`. */
  readonly tooSmall: (min: number) => string;
  /** A number above `max`. */
  readonly tooLarge: (max: number) => string;
  /** A date before `min`, given as `'YYYY-MM-DD'`. */
  readonly tooEarly: (min: string) => string;
  /** A date after `max`, given as `'YYYY-MM-DD'`. */
  readonly tooLate: (max: string) => string;
};
