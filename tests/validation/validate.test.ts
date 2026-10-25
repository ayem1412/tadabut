import { describe, expect, it, vi } from 'vitest';

import { validateValue } from '../../src/validation/validate';

const row = { id: 1, active: true };

describe('validateValue', () => {
  describe('required', () => {
    it.each([null, undefined, ''])('fails on %j', (value) => {
      expect(validateValue({ type: 'text', required: true }, value, row)).toBe(
        'This field is required.',
      );
    });

    it('passes when there is a value', () => {
      expect(validateValue({ type: 'text', required: true }, 'Amina', row)).toBeUndefined();
    });

    it('does nothing on a checkbox, which is never empty', () => {
      expect(validateValue({ type: 'checkbox', required: true }, false, row)).toBeUndefined();
    });
  });

  describe('empty optional fields', () => {
    it('never fail a built-in rule', () => {
      expect(validateValue({ type: 'number', min: 18 }, null, row)).toBeUndefined();
      expect(validateValue({ type: 'text', minLength: 2 }, '', row)).toBeUndefined();
    });

    it('never reach validate', () => {
      const validate = vi.fn(() => 'Error');

      expect(validateValue({ type: 'text', validate }, '', row)).toBeUndefined();
      expect(validate).not.toHaveBeenCalled();
    });
  });

  describe('text', () => {
    it('checks minLength at its edge', () => {
      const config = { type: 'text', minLength: 3 } as const;

      expect(validateValue(config, 'ab', row)).toBe('Must be at least 3 characters.');
      expect(validateValue(config, 'abc', row)).toBeUndefined();
    });

    it('checks maxLength at its edge', () => {
      const config = { type: 'text', maxLength: 3 } as const;

      expect(validateValue(config, 'abcd', row)).toBe('Must be at most 3 characters.');
      expect(validateValue(config, 'abc', row)).toBeUndefined();
    });

    it('makes pattern match the whole value', () => {
      const config = { type: 'text', pattern: '[0-9]{4}' } as const;

      expect(validateValue(config, '2024', row)).toBeUndefined();
      expect(validateValue(config, 'x2024', row)).toBe('Wrong format.');
      expect(validateValue(config, '20245', row)).toBe('Wrong format.');
    });

    it('keeps a pattern with | in one piece', () => {
      const config = { type: 'text', pattern: 'a|b' } as const;

      expect(validateValue(config, 'a', row)).toBeUndefined();
      expect(validateValue(config, 'ab', row)).toBe('Wrong format.');
    });

    it('ignores an invalid pattern, like browsers do', () => {
      expect(validateValue({ type: 'text', pattern: '(' }, 'anything', row)).toBeUndefined();
    });
  });

  describe('number', () => {
    it('checks min at its edge', () => {
      const config = { type: 'number', min: 18 } as const;

      expect(validateValue(config, 17, row)).toBe('Must be 18 or more.');
      expect(validateValue(config, 18, row)).toBeUndefined();
    });

    it('checks max at its edge', () => {
      const config = { type: 'number', max: 65 } as const;

      expect(validateValue(config, 66, row)).toBe('Must be 65 or less.');
      expect(validateValue(config, 65, row)).toBeUndefined();
    });

    it('treats 0 as a value, not as empty', () => {
      expect(validateValue({ type: 'number', required: true, min: 1 }, 0, row)).toBe(
        'Must be 1 or more.',
      );
    });
  });

  describe('date', () => {
    it('checks min at its edge', () => {
      const config = { type: 'date', min: '2020-01-01' } as const;

      expect(validateValue(config, '2019-12-31', row)).toBe('Must be on or after 2020-01-01.');
      expect(validateValue(config, '2020-01-01', row)).toBeUndefined();
    });

    it('checks max at its edge', () => {
      const config = { type: 'date', max: '2030-12-31' } as const;

      expect(validateValue(config, '2031-01-01', row)).toBe('Must be on or before 2030-12-31.');
      expect(validateValue(config, '2030-12-31', row)).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('gets the value and the row, and its message comes back', () => {
      const validate = vi.fn(() => 'Too old');

      expect(validateValue({ type: 'number', validate }, 70, row)).toBe('Too old');
      expect(validate).toHaveBeenCalledWith(70, row);
    });

    it('passes when it returns undefined', () => {
      expect(validateValue({ type: 'number', validate: () => undefined }, 70, row)).toBeUndefined();
    });

    it('works on editors without built-in rules', () => {
      expect(validateValue({ type: 'select', options: [], validate: () => 'No' }, 1, row)).toBe(
        'No',
      );
    });

    it('does not run when a built-in rule already failed', () => {
      const validate = vi.fn(() => 'Too old');

      expect(validateValue({ type: 'number', min: 18, validate }, 10, row)).toBe(
        'Must be 18 or more.',
      );
      expect(validate).not.toHaveBeenCalled();
    });
  });
});
