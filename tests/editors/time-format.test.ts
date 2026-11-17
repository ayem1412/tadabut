import { describe, expect, it } from 'vitest';
import { dataSeparator } from '../../src/editors/datetime-format';
import { formatDateTime, formatTime, parseDateTime, parseTime } from '../../src/index';

describe('parseTime', () => {
  it('reads hh:mm and hh:mm:ss', () => {
    expect(parseTime('14:30')).toBe('14:30:00');
    expect(parseTime('14:30:15')).toBe('14:30:15');
    expect(parseTime('00:00')).toBe('00:00:00');
    expect(parseTime('23:59:59')).toBe('23:59:59');
  });

  it('accepts one digit for the hour', () => {
    expect(parseTime('9:05')).toBe('09:05:00');
  });

  it('ignores spaces around, and what comes after the seconds', () => {
    expect(parseTime(' 14:30 ')).toBe('14:30:00');
    expect(parseTime('14:30:15.000Z')).toBe('14:30:15');
  });

  it('gives null for times that do not exist', () => {
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('12:30:60')).toBeNull();
  });

  it('gives null for anything else', () => {
    expect(parseTime('9:5')).toBeNull();
    expect(parseTime('8h')).toBeNull();
    expect(parseTime('abc')).toBeNull();
    expect(parseTime('')).toBeNull();
  });
});

describe('formatTime', () => {
  it('drops the seconds unless asked', () => {
    expect(formatTime('09:05:00', false)).toBe('09:05');
    expect(formatTime('09:05:00', true)).toBe('09:05:00');
  });
});

describe('parseDateTime', () => {
  it('reads a date in format, then a time after a space or a T', () => {
    expect(parseDateTime('05/01/2024 14:30', 'dd/mm/yyyy')).toBe('2024-01-05T14:30:00');
    expect(parseDateTime('05/01/2024T14:30', 'dd/mm/yyyy')).toBe('2024-01-05T14:30:00');
    expect(parseDateTime('2024-01-05T14:30:15', 'yyyy-mm-dd')).toBe('2024-01-05T14:30:15');
    expect(parseDateTime('2024-01-05 14:30', 'yyyy-mm-dd')).toBe('2024-01-05T14:30:00');
  });

  it('counts a date alone as midnight', () => {
    expect(parseDateTime('05/01/2024', 'dd/mm/yyyy')).toBe('2024-01-05T00:00:00');
  });

  it('ignores a time zone instead of converting it', () => {
    expect(parseDateTime('2024-01-05T14:30:00.000Z', 'yyyy-mm-dd')).toBe('2024-01-05T14:30:00');
  });

  it('gives null when the date or the time is not real', () => {
    expect(parseDateTime('31/02/2024 10:00', 'dd/mm/yyyy')).toBeNull();
    expect(parseDateTime('05/01/2024 25:00', 'dd/mm/yyyy')).toBeNull();
    expect(parseDateTime('2024-01-05 14:30', 'dd/mm/yyyy')).toBeNull();
    expect(parseDateTime('', 'dd/mm/yyyy')).toBeNull();
  });
});

describe('formatDateTime', () => {
  it('writes the date in format, then the separator and the time', () => {
    expect(formatDateTime('2024-01-05T14:30:15', 'dd/mm/yyyy', false, ' ')).toBe(
      '05/01/2024 14:30',
    );
    expect(formatDateTime('2024-01-05T14:30:15', 'dd.mm.yyyy', true, ' ')).toBe(
      '05.01.2024 14:30:15',
    );
    expect(formatDateTime('2024-01-05T14:30:00', 'yyyy-mm-dd', false, 'T')).toBe(
      '2024-01-05T14:30',
    );
  });

  it('is the opposite of parseDateTime', () => {
    const value = '31/12/2024 23:59';

    expect(formatDateTime(parseDateTime(value, 'dd/mm/yyyy') ?? '', 'dd/mm/yyyy', false, ' ')).toBe(
      value,
    );
  });
});

describe('dataSeparator', () => {
  it('uses a T for ISO data, and a space otherwise', () => {
    expect(dataSeparator('yyyy-mm-dd')).toBe('T');
    expect(dataSeparator('dd/mm/yyyy')).toBe(' ');
    expect(dataSeparator('yyyy/mm/dd')).toBe(' ');
  });
});
