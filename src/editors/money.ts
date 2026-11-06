import type { BaseEditor } from './base';
import { addClasses } from './classes';
import type { EditorContext, EditorInstance } from './instance';
import {
  caretAt,
  countKept,
  defaultMoneyFormat,
  formatMoney,
  formatTyping,
  type MoneyFormat,
  parseMoney,
} from './money-format';

/**
 * For `number` columns that hold money. Shows `12 500.00` while typing and in
 * the cells. The row keeps a plain number.
 *
 * @example
 * { type: 'money', min: 0 }
 * { type: 'money', separator: '.', point: ',' } // 12.500,00
 */
export type MoneyEditor = BaseEditor & {
  /** Picks this editor. */
  readonly type: 'money';
  /** Smallest value allowed. */
  readonly min?: number;
  /** Largest value allowed. */
  readonly max?: number;
  /** Digits after the point. Defaults to `2`. */
  readonly decimals?: number;
  /** Between thousands. Defaults to a space. */
  readonly separator?: string;
  /** The decimal point shown. Defaults to `'.'`. Typing `.` or `,` both work. */
  readonly point?: string;
};

/** The config's format, with the defaults filled in. */
export function moneyFormat(config: MoneyEditor): MoneyFormat {
  return {
    decimals: config.decimals ?? defaultMoneyFormat.decimals,
    separator: config.separator ?? defaultMoneyFormat.separator,
    point: config.point ?? defaultMoneyFormat.point,
  };
}

/**
 * Builds the money input. It regroups while typing, keeps the cursor in place,
 * and fills in the decimals on blur.
 */
export function createMoneyEditor(
  config: MoneyEditor,
  context: EditorContext<number | null>,
): EditorInstance<number | null> {
  const format = moneyFormat(config);

  // Not type="number": it can't show spaces, and drops what it can't read.
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  addClasses(input, ['tdb-input', 'tdb-input-money'], context.className);

  /** Read from the text every time, so there's no copy to get out of sync. */
  const getValue = (): number | null => parseMoney(input.value, format);

  /** Shows the value fully formatted, decimals included. */
  const setValue = (value: number | null): void => {
    input.value = formatMoney(value, format);
  };

  setValue(context.value);

  input.addEventListener('input', () => {
    const caret = input.selectionStart ?? input.value.length;
    const kept = countKept(input.value, caret, format);
    const next = formatTyping(input.value, format);

    // Setting the value moves the cursor to the end, so only when it changed.
    if (next !== input.value) {
      input.value = next;
      const position = caretAt(next, kept, format);
      input.setSelectionRange(position, position);
    }

    context.onChange(getValue());
  });

  input.addEventListener('blur', () => setValue(getValue()));

  return {
    element: input,
    getValue,
    setValue,
    focus: () => input.focus(),
    destroy: () => input.remove(),
  };
}
