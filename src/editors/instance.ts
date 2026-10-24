/**
 * What an editor receives when Tadabut creates it, at the start of a row edit.
 *
 * Custom editors get the same context as the built-in ones.
 *
 * @typeParam Value - The column's value type.
 */
export type EditorContext<Value> = {
  /** The value from the row when editing starts. */
  readonly value: Value;
  /**
   * Extra CSS classes from the editor config, if any. Add them to the
   * element, next to your own classes.
   */
  readonly className?: string;
  /**
   * Call this every time the user changes the value, with the new value.
   * Tadabut keeps track of the previous one.
   */
  readonly onChange: (value: Value) => void;
};

/**
 * A live editor: the input shown in a cell while a row is being edited.
 *
 * Every editor, built-in or custom, returns one of these. Tadabut puts
 * `element` in the cell, reads the value with `getValue` when saving, and
 * calls `destroy` when editing ends.
 *
 * @typeParam Value - The column's value type.
 */
export type EditorInstance<Value> = {
  /** The root element. Tadabut adds it to the cell. */
  readonly element: HTMLElement;
  /** Returns the value the user has entered so far. */
  readonly getValue: () => Value;
  /** Shows a new value, without calling `onChange`. */
  readonly setValue: (value: Value) => void;
  /** Puts the cursor in the editor. */
  readonly focus: () => void;
  /**
   * Removes the element and cleans up anything the editor created, like
   * listeners or third-party widgets. Called once, when editing ends.
   */
  readonly destroy: () => void;
};
