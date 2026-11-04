import type { Texts } from './texts';

/** English, the default. */
export const en: Texts = {
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  loading: 'Loading…',
  saveFailed: 'Could not save.',
  loadFailed: 'Could not load the options.',
  required: 'This field is required.',
  patternMismatch: 'Wrong format.',
  tooShort: (min) => `Must be at least ${min} characters.`,
  tooLong: (max) => `Must be at most ${max} characters.`,
  tooSmall: (min) => `Must be ${min} or more.`,
  tooLarge: (max) => `Must be ${max} or less.`,
  tooEarly: (min) => `Must be on or after ${min}.`,
  tooLate: (max) => `Must be on or before ${max}.`,
};
