import { describe, expect, it, vi } from 'vitest';

import { createDateTimeEditor, type DateTimeEditor } from '../../src/editors/datetime';
import { createTimeEditor, type TimeEditor } from '../../src/editors/time';
import { type } from '../helpers';

function setupTime(config: Omit<TimeEditor, 'type'> = {}, value: string | null = '14:30') {
  const onChange = vi.fn();
  const editor = createTimeEditor(
    { type: 'time', ...config },
    { value, onChange, className: config.className },
  );
  const input = editor.element as HTMLInputElement;
  document.body.append(input);

  return { editor, input, onChange };
}

function setupDateTime(
  config: Omit<DateTimeEditor, 'type'> = {},
  value: string | null = '2024-01-05T14:30',
) {
  const onChange = vi.fn();
  const editor = createDateTimeEditor(
    { type: 'datetime', ...config },
    { value, onChange, className: config.className },
  );
  const input = editor.element as HTMLInputElement;
  document.body.append(input);

  return { editor, input, onChange };
}

describe('time editor', () => {
  it('is a time input with its classes', () => {
    const { input } = setupTime({ className: 'form-control' });

    expect(input.type).toBe('time');
    expect([...input.classList]).toEqual(['tdb-input', 'tdb-input-time', 'form-control']);
  });

  it('shows the value, and gives it back the same way', () => {
    const { editor, input } = setupTime({}, '9:05');

    expect(input.value).toBe('09:05');
    expect(editor.getValue()).toBe('09:05');
  });

  it('gives the new value while typing', () => {
    const { editor, input, onChange } = setupTime();

    type(input, '16:45');

    expect(editor.getValue()).toBe('16:45');
    expect(onChange).toHaveBeenLastCalledWith('16:45');
  });

  it('shows and gives the seconds with seconds', () => {
    const { editor, input } = setupTime({ seconds: true }, '14:30');

    expect(input.step).toBe('1');
    expect(input.value).toBe('14:30:00');
    expect(editor.getValue()).toBe('14:30:00');
  });

  it('adds the seconds a browser left out', () => {
    const { editor, input } = setupTime({ seconds: true });

    // Some browsers give hh:mm when the seconds are 0.
    type(input, '10:15');

    expect(editor.getValue()).toBe('10:15:00');
  });

  it('gives null when empty, and shows a value that is not a time as empty', () => {
    const { editor, input } = setupTime({}, '25:00');

    expect(input.value).toBe('');
    expect(editor.getValue()).toBeNull();

    editor.setValue('08:00');
    editor.setValue(null);

    expect(input.value).toBe('');
  });

  it('passes min and max to the input', () => {
    const { input } = setupTime({ min: '8:00', max: '18:00' });

    expect(input.min).toBe('08:00');
    expect(input.max).toBe('18:00');
  });
});

describe('datetime editor', () => {
  it('is a date-and-time input with its classes', () => {
    const { input } = setupDateTime();

    expect(input.type).toBe('datetime-local');
    expect(input.classList.contains('tdb-input-datetime')).toBe(true);
  });

  it('reads and gives back ISO data with a T', () => {
    const { editor, input } = setupDateTime({}, '2024-01-05T14:30:00.000Z');

    expect(input.value).toBe('2024-01-05T14:30');
    expect(editor.getValue()).toBe('2024-01-05T14:30');
  });

  it('reads and gives back data in format with a space', () => {
    const { editor, input, onChange } = setupDateTime({ format: 'dd/mm/yyyy' }, '05/01/2024 14:30');

    expect(input.value).toBe('2024-01-05T14:30');

    type(input, '2024-02-29T10:15');

    expect(editor.getValue()).toBe('29/02/2024 10:15');
    expect(onChange).toHaveBeenLastCalledWith('29/02/2024 10:15');
  });

  it('shows a date alone as midnight', () => {
    const { input } = setupDateTime({ format: 'dd/mm/yyyy' }, '05/01/2024');

    expect(input.value).toBe('2024-01-05T00:00');
  });

  it('shows and gives the seconds with seconds', () => {
    const { editor, input } = setupDateTime(
      { format: 'dd/mm/yyyy', seconds: true },
      '05/01/2024 14:30',
    );

    expect(input.step).toBe('1');
    // The input drops ":00" seconds by itself, so getValue puts them back.
    expect(input.value).toBe('2024-01-05T14:30');
    expect(editor.getValue()).toBe('05/01/2024 14:30:00');
  });

  it('shows a value that is not real, or in another format, as empty', () => {
    expect(setupDateTime({ format: 'dd/mm/yyyy' }, '31/02/2024 10:00').input.value).toBe('');
    expect(setupDateTime({ format: 'dd/mm/yyyy' }, '2024-01-05 10:00').input.value).toBe('');
    expect(setupDateTime({}, null).editor.getValue()).toBeNull();
  });

  it('passes min and max to the input, written like the data', () => {
    const { input } = setupDateTime({
      format: 'dd/mm/yyyy',
      min: '01/01/2024 08:00',
      max: '31/12/2024',
    });

    expect(input.min).toBe('2024-01-01T08:00');
    expect(input.max).toBe('2024-12-31T00:00');
  });

  it('is locked with readOnly', () => {
    const editor = createDateTimeEditor(
      { type: 'datetime', readOnly: true },
      { value: null, onChange: vi.fn(), readOnly: true },
    );

    expect((editor.element as HTMLInputElement).disabled).toBe(true);
  });
});
