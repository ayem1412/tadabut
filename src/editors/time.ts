import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';
import { formatTime, parseTime } from './time-format';

/**
 * For `string` columns holding a time, like `'14:30'`. Anything that isn't a
 * time shows as empty and saves as `null`. Empty gives `null`.
 *
 * @example
 * { type: 'time', min: '08:00', max: '18:00' }
 */
export type TimeEditor = BaseEditor & {
  /** Picks this editor. */
  readonly type: 'time';
  /** Earliest time, like `'08:00'`. */
  readonly min?: string;
  /** Latest time, like `'18:00'`. */
  readonly max?: string;
  /** Shows and saves the seconds: `'14:30:00'` instead of `'14:30'`. Defaults to `false`. */
  readonly seconds?: boolean;
};

/** Builds the time input. */
export function createTimeEditor(
  config: TimeEditor,
  context: EditorContext<string | null>,
): EditorInstance<string | null> {
  const seconds = config.seconds ?? false;

  const input = document.createElement('input');
  input.type = 'time';
  input.disabled = context.readOnly ?? false;
  addClasses(input, ['tdb-input', 'tdb-input-time'], context.className);

  // Without a step under a minute, the browser hides the seconds.
  if (seconds) {
    input.step = '1';
  }

  // checkOptions already threw if these aren't real times.
  if (config.min !== undefined) {
    input.min = formatTime(parseTime(config.min) ?? '', seconds);
  }

  if (config.max !== undefined) {
    input.max = formatTime(parseTime(config.max) ?? '', seconds);
  }

  /**
   * Empty gives `null`. Read through `parseTime`, since some browsers drop
   * `:00` seconds.
   */
  const getValue = (): string | null =>
    input.value === '' ? null : formatTime(parseTime(input.value) ?? '', seconds);

  /** `null`, or a value that isn't a time, shows as empty. */
  const setValue = (value: string | null): void => {
    const time = value === null ? null : parseTime(value);
    input.value = time === null ? '' : formatTime(time, seconds);
  };

  setValue(context.value ?? null);

  input.addEventListener('input', () => context.onChange(getValue()));

  return {
    element: input,
    getValue,
    setValue,
    focus: () => input.focus(),
    destroy: () => input.remove(),
  };
}
