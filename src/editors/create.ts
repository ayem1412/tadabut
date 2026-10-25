import { createCheckboxEditor } from './checkbox';
import { createDateEditor } from './date';
import type { AnyEditor } from './editor';
import type { EditorContext, EditorInstance } from './instance';
import { createNumberEditor } from './number';
import { createSelectEditor } from './select';
import { createTextEditor } from './text';

/**
 * Creates the live editor that matches a column's editor config.
 *
 * Internal: Tadabut calls it for each editable cell when a row starts being
 * edited.
 *
 * The exact column type is not known here, so values are `unknown`.
 * That is safe: `Column<Row>` already checked that the config fits the
 * column, before the table was created.
 *
 * @param config The editor config from the column.
 * @param context The starting value and the change callback.
 */
export function createEditor(
  config: AnyEditor,
  context: EditorContext<unknown>,
): EditorInstance<unknown> {
  const ctx = { ...context, className: config.className };

  switch (config.type) {
    case 'text':
      return loosen(createTextEditor(config, tighten(ctx)));

    case 'number':
      return loosen(createNumberEditor(config, tighten(ctx)));

    case 'date':
      return loosen(createDateEditor(config, tighten(ctx)));

    case 'checkbox':
      return loosen(createCheckboxEditor(config, tighten(ctx)));

    case 'select':
      return createSelectEditor(config, ctx);

    case 'custom':
      return config.create(ctx);

    default: {
      // Fails to compile if an editor type above has no `case`.
      const missing: never = config;
      throw new Error(`Unknown editor: ${JSON.stringify(missing)}`);
    }
  }
}

/** Gives a built-in editor the context type it expects. */
function tighten<Value>(context: EditorContext<unknown>): EditorContext<Value> {
  return context as EditorContext<Value>;
}

/** Turns a typed editor back into the loose type `createEditor` returns. */
function loosen<Value>(editor: EditorInstance<Value>): EditorInstance<unknown> {
  return editor as unknown as EditorInstance<unknown>;
}
