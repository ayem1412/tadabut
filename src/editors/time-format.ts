/**
 * Reads `'h:mm'`, `'hh:mm'` or `'hh:mm:ss'`, and gives `'hh:mm:ss'`. Anything
 * after is ignored, like `'.000Z'`. `null` if it isn't a real time.
 *
 * @example
 * parseTime('9:05'); // '09:05:00'
 */
export function parseTime(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (match === null) {
    return null;
  }

  const [, hh = '', mm = '', ss = '00'] = match;

  if (Number(hh) > 23 || Number(mm) > 59 || Number(ss) > 59) {
    return null;
  }

  return `${hh.padStart(2, '0')}:${mm}:${ss}`;
}

/**
 * Writes a time `parseTime` returned, with or without the seconds.
 *
 * @example
 * formatTime('09:05:00', false); // '09:05'
 */
export function formatTime(time: string, seconds: boolean): string {
  return seconds ? time : time.slice(0, 5);
}
