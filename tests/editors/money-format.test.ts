import { describe, expect, it } from 'vitest';

import {
  caretAt,
  countKept,
  formatMoney,
  formatTyping,
  parseMoney,
  defaultMoneyFormat as plain,
} from '../../src/editors/money-format';

/** `12.500,00` */
const german = { decimals: 2, separator: '.', point: ',' };

describe('formatMoney', () => {
  it('groups thousands and fills in the decimals', () => {
    expect(formatMoney(1234567.5, plain)).toBe('1 234 567.50');
    expect(formatMoney(0, plain)).toBe('0.00');
    expect(formatMoney(999, plain)).toBe('999.00');
  });

  it('keeps the minus in front of the groups', () => {
    expect(formatMoney(-1234.5, plain)).toBe('-1 234.50');
  });

  it('shows null as nothing', () => {
    expect(formatMoney(null, plain)).toBe('');
  });

  it('follows decimals, separator and point', () => {
    expect(formatMoney(12500, { ...plain, decimals: 0 })).toBe('12 500');
    expect(formatMoney(12500.5, german)).toBe('12.500,50');
  });
});

describe('parseMoney', () => {
  it('reads separators and either decimal point', () => {
    expect(parseMoney('1 234 567.50', plain)).toBe(1234567.5);
    expect(parseMoney('1 234,5', plain)).toBe(1234.5);
    expect(parseMoney('-12 500', plain)).toBe(-12500);
  });

  it('rounds to the decimals, 1.005 included', () => {
    expect(parseMoney('1 234,567', plain)).toBe(1234.57);
    expect(parseMoney('1.005', plain)).toBe(1.01);
    expect(parseMoney('12.6', { ...plain, decimals: 0 })).toBe(13);
  });

  it('gives null for nothing or junk', () => {
    expect(parseMoney('', plain)).toBeNull();
    expect(parseMoney('  ', plain)).toBeNull();
    expect(parseMoney('abc', plain)).toBeNull();
    expect(parseMoney('-', plain)).toBeNull();
  });

  it('only takes a comma as the point when the separator is a dot', () => {
    expect(parseMoney('12.500,5', german)).toBe(12500.5);
  });
});

describe('formatTyping', () => {
  it('regroups without filling in the decimals', () => {
    expect(formatTyping('12500', plain)).toBe('12 500');
    expect(formatTyping('12500,5', plain)).toBe('12 500.5');
  });

  it('keeps a point that was just typed', () => {
    expect(formatTyping('12 500.', plain)).toBe('12 500.');
  });

  it('refuses one decimal too many', () => {
    expect(formatTyping('12.345', plain)).toBe('12.34');
  });

  it('drops letters and leading zeros', () => {
    expect(formatTyping('1a2', plain)).toBe('12');
    expect(formatTyping('0012', plain)).toBe('12');
    expect(formatTyping('0', plain)).toBe('0');
  });

  it('adds a 0 before a lone point', () => {
    expect(formatTyping('.5', plain)).toBe('0.5');
  });

  it('keeps the minus', () => {
    expect(formatTyping('-1234', plain)).toBe('-1 234');
    expect(formatTyping('-', plain)).toBe('-');
  });

  it('drops the point when there are no decimals', () => {
    expect(formatTyping('12.', { ...plain, decimals: 0 })).toBe('12');
  });

  it('follows the separator and point', () => {
    expect(formatTyping('12500,5', german)).toBe('12.500,5');
  });
});

describe('the cursor helpers', () => {
  it('count only what survives formatting', () => {
    expect(countKept('12 500', 4, plain)).toBe(3);
    expect(countKept('1a2', 3, plain)).toBe(2);
    expect(countKept('12 500.5', 8, plain)).toBe(7);
  });

  it('put the cursor after the same number of kept characters', () => {
    expect(caretAt('125 500', 3, plain)).toBe(3);
    expect(caretAt('1 234', 2, plain)).toBe(3);
    expect(caretAt('1 234', 0, plain)).toBe(0);
    expect(caretAt('12', 5, plain)).toBe(2);
  });
});
