import { describe, expect, it } from 'vitest';

import { type DateFormat, defaultDateFormat, formatDate, parseDate } from '../../src/index';

describe('parseDate', () => {
  it('reads every order and separator', () => {
    const cases: [string, DateFormat][] = [
      ['2024-01-05', 'yyyy-mm-dd'],
      ['05/01/2024', 'dd/mm/yyyy'],
      ['05.01.2024', 'dd.mm.yyyy'],
      ['01-05-2024', 'mm-dd-yyyy'],
      ['2024/05/01', 'yyyy/dd/mm'],
      ['05-2024-01', 'dd-yyyy-mm'],
      ['01.2024.05', 'mm.yyyy.dd'],
    ];

    for (const [value, format] of cases) {
      expect(parseDate(value, format), format).toBe('2024-01-05');
    }
  });

  it('accepts a day and month without the 0', () => {
    expect(parseDate('5/1/2024', 'dd/mm/yyyy')).toBe('2024-01-05');
  });

  it('drops a time after the date', () => {
    expect(parseDate('2024-01-05T10:30:00', 'yyyy-mm-dd')).toBe('2024-01-05');
    expect(parseDate('2024-01-05T10:30:00.000Z', 'yyyy-mm-dd')).toBe('2024-01-05');
    expect(parseDate('05/01/2024 10:30', 'dd/mm/yyyy')).toBe('2024-01-05');
    expect(parseDate(' 05/01/2024 ', 'dd/mm/yyyy')).toBe('2024-01-05');
  });

  it('gives null for days that do not exist', () => {
    expect(parseDate('31/02/2024', 'dd/mm/yyyy')).toBeNull();
    expect(parseDate('29/02/2023', 'dd/mm/yyyy')).toBeNull();
    expect(parseDate('00/01/2024', 'dd/mm/yyyy')).toBeNull();
    expect(parseDate('05/13/2024', 'dd/mm/yyyy')).toBeNull();
  });

  it('knows leap years', () => {
    expect(parseDate('29/02/2024', 'dd/mm/yyyy')).toBe('2024-02-29');
    expect(parseDate('29/02/2000', 'dd/mm/yyyy')).toBe('2000-02-29');
    expect(parseDate('29/02/1900', 'dd/mm/yyyy')).toBeNull();
  });

  it('gives null for another format, or no date at all', () => {
    expect(parseDate('2024-01-05', 'dd/mm/yyyy')).toBeNull();
    expect(parseDate('2024/01/05', 'dd/mm/yyyy')).toBeNull();
    expect(parseDate('05/01/24', 'dd/mm/yyyy')).toBeNull();
    expect(parseDate('05/01', 'dd/mm/yyyy')).toBeNull();
    expect(parseDate('aa/bb/cccc', 'dd/mm/yyyy')).toBeNull();
    expect(parseDate('', 'dd/mm/yyyy')).toBeNull();
  });
});

describe('formatDate', () => {
  it('writes an ISO date in any format', () => {
    expect(formatDate('2024-01-05', 'dd/mm/yyyy')).toBe('05/01/2024');
    expect(formatDate('2024-01-05', 'dd.mm.yyyy')).toBe('05.01.2024');
    expect(formatDate('2024-01-05', 'mm-dd-yyyy')).toBe('01-05-2024');
    expect(formatDate('2024-01-05', defaultDateFormat)).toBe('2024-01-05');
  });

  it('is the opposite of parseDate', () => {
    expect(parseDate(formatDate('2024-12-31', 'mm/dd/yyyy'), 'mm/dd/yyyy')).toBe('2024-12-31');
  });
});

describe('DateFormat', () => {
  it('only allows dd, mm and yyyy with one separator', () => {
    // @ts-expect-error: two different separators
    const mixed: DateFormat = 'dd/mm-yyyy';
    // @ts-expect-error: short parts
    const short: DateFormat = 'd/m/yyyy';

    expect([mixed, short]).toHaveLength(2);
  });
});
