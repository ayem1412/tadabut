import { en } from '../texts/en';
import type { Texts } from '../texts/texts';
import { createCheckboxEditor } from './checkbox';
import { createDateEditor } from './date';
import type { AnyEditor } from './editor';
import type { EditorContext, EditorInstance } from './instance';
import { createNumberEditor } from './number';
import { createSelectEditor, type LoadResult } from './select';
import { createTextEditor } from './text';

/** Only selects have `load` and `getLabel`. */
export type AnyEditorInstance = EditorInstance<unknown> & {
  /** Loads the options of a select. */
  readonly load?: (row: Record<string, unknown>) => Promise<LoadResult>;
  /** The picked option's label, for `labelProp`. */
  readonly getLabel?: () => string | null | undefined;
};

/**
 * `Column<Row>` already checked that each config fits its column, so the
 * casts below are safe.
 */
export function createEditor(
  config: AnyEditor,
  context: EditorContext<unknown>,
  texts: Texts = en,
): AnyEditorInstance {
  const fullContext = { ...context, className: config.className };

  switch (config.type) {
    case 'text':
      return loosen(createTextEditor(config, tighten(fullContext)));

    case 'number':
      return loosen(createNumberEditor(config, tighten(fullContext)));

    case 'date':
      return loosen(createDateEditor(config, tighten(fullContext)));

    case 'checkbox':
      return createCheckboxEditor(config, fullContext);

    case 'select':
      return createSelectEditor(config, fullContext, texts);

    case 'custom':
      return config.create(fullContext);

    default: {
      const missing: never = config;
      throw new Error(`Unknown editor: ${JSON.stringify(missing)}`);
    }
  }
}

/** Gives a built-in editor the context type it expects. */
function tighten<Value>(context: EditorContext<unknown>): EditorContext<Value> {
  return context as EditorContext<Value>;
}

/** Turns a typed editor back into the loose type. */
function loosen<Value>(editor: EditorInstance<Value>): EditorInstance<unknown> {
  return editor as unknown as EditorInstance<unknown>;
}
