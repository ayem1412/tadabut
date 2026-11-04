import type { Texts } from './texts';

/** French. */
export const fr: Texts = {
  edit: 'Modifier',
  save: 'Enregistrer',
  cancel: 'Annuler',
  loading: 'Chargement…',
  saveFailed: "Impossible d'enregistrer.",
  loadFailed: 'Impossible de charger les options.',
  required: 'Ce champ est obligatoire.',
  patternMismatch: 'Format incorrect.',
  tooShort: (min) => `Au moins ${min} caractères.`,
  tooLong: (max) => `Au plus ${max} caractères.`,
  tooSmall: (min) => `Doit être supérieur ou égal à ${min}.`,
  tooLarge: (max) => `Doit être inférieur ou égal à ${max}.`,
  tooEarly: (min) => `Doit être le ${min} ou après.`,
  tooLate: (max) => `Doit être le ${max} ou avant.`,
};
