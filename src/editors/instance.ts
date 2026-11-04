/** What a custom editor's `create` receives. */
export type EditorContext<Value> = {
  /** The field's value when the row opened. */
  readonly value: Value;
  /** The `className` from the editor config. Put it on your element. */
  readonly className?: string;
  /** Call it when the user changes the value. */
  readonly onChange: (value: Value) => void;
};

/** What a custom editor's `create` returns. */
export type EditorInstance<Value> = {
  /** Goes into the cell. */
  readonly element: HTMLElement;
  /** What the user has entered so far. */
  readonly getValue: () => Value;
  /** Must not call `onChange`. */
  readonly setValue: (value: Value) => void;
  /** Moves the cursor into your editor. */
  readonly focus: () => void;
  /** Remove the element and tear down any widget you created. */
  readonly destroy: () => void;
};
