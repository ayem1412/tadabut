/** Options every editor has. */
export type BaseEditor = {
  /** Extra classes for the input, like `'form-control'`. */
  readonly className?: string;
  /**
   * Shows the value in a locked input. The field is never checked, and saving
   * keeps the value as it was. Defaults to `false`.
   */
  readonly readOnly?: boolean;
};
