import { escapeHtml } from '../columns/escape';
import { splitClasses } from '../editors/classes';
import type { Texts } from '../texts/texts';
import type { TableClassNames } from './options';

/** A button of the actions column, when no row is open. */
export type Action = 'edit' | 'delete';

/** Every button Tadabut makes, by its `data-tdb-action`. */
export type ButtonAction = Action | 'save' | 'cancel' | 'confirm' | 'keep' | 'detail';

/** The same list at runtime, to check what's read back from the page. */
const buttonActions: ReadonlySet<string> = new Set<ButtonAction>([
  'edit',
  'delete',
  'save',
  'cancel',
  'confirm',
  'keep',
  'detail',
]);

/** Whether a `data-tdb-action` is one of ours. */
export function isButtonAction(value: string | undefined): value is ButtonAction {
  return value !== undefined && buttonActions.has(value);
}

/** Edit or Delete as HTML, for DataTables' `defaultContent`, so everything in it is escaped. */
export function buttonHtml(action: Action, label: string, extra: readonly string[]): string {
  const classes = ['tdb-button', `tdb-button-${action}`, ...extra].join(' ');

  return `<button type="button" class="${escapeHtml(classes)}" data-tdb-action="${action}">${escapeHtml(label)}</button>`;
}

/** Builds a button that replaces Edit and Delete for a while. */
function actionButton(
  action: Exclude<ButtonAction, Action>,
  label: string,
  extra: readonly string[],
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('tdb-button', `tdb-button-${action}`, ...extra);
  button.dataset.tdbAction = action;
  button.textContent = label;

  return button;
}

/** Save and Cancel, for an open row. */
export function saveCancelButtons(texts: Texts, classNames: TableClassNames): HTMLButtonElement[] {
  return [
    actionButton('save', texts.save, splitClasses(classNames.button, classNames.save)),
    actionButton('cancel', texts.cancel, splitClasses(classNames.button, classNames.cancel)),
  ];
}

/**
 * "Delete this row? [Yes, delete] [No]". `keep` is returned on its own so it
 * can get the focus.
 */
export function deleteQuestion(
  texts: Texts,
  classNames: TableClassNames,
): { readonly parts: readonly HTMLElement[]; readonly keep: HTMLButtonElement } {
  const question = document.createElement('span');
  question.className = 'tdb-delete-question';
  question.textContent = texts.deleteQuestion;

  const confirm = actionButton(
    'confirm',
    texts.confirm,
    splitClasses(classNames.button, classNames.confirm),
  );
  const keep = actionButton('keep', texts.keep, splitClasses(classNames.button, classNames.keep));

  return { parts: [question, confirm, keep], keep };
}

/**
 * The message of a save, delete or add error. It gets its own class because
 * Bootstrap colors every cell, which hides a color on the row. Set as text:
 * it often comes from a server.
 */
export function rowErrorMessage(message: string): HTMLDivElement {
  const error = document.createElement('div');
  error.className = 'tdb-row-error-message';
  error.textContent = message;

  return error;
}

/** The header's "check all" checkbox, as HTML for the column title. */
export function selectAllHtml(texts: Texts, classNames: TableClassNames): string {
  return checkboxHtml('tdb-select-all', texts.selectAll, classNames);
}

/** A row's checkbox, as HTML for `defaultContent`. */
export function selectRowHtml(texts: Texts, classNames: TableClassNames): string {
  return checkboxHtml('tdb-select-row', texts.selectRow, classNames);
}

/** A selection checkbox as HTML, so the classes and the label are escaped. */
function checkboxHtml(kind: string, label: string, classNames: TableClassNames): string {
  const classes = [kind, ...splitClasses(classNames.select)].join(' ');

  return `<input type="checkbox" class="${escapeHtml(classes)}" aria-label="${escapeHtml(label)}">`;
}

/** The ▸ button that opens a row's detail, as HTML for `defaultContent`. Starts closed. */
export function detailToggleHtml(texts: Texts, classNames: TableClassNames): string {
  const classes = ['tdb-detail-toggle', ...splitClasses(classNames.detail)].join(' ');

  return `<button type="button" class="${escapeHtml(classes)}" data-tdb-action="detail" aria-expanded="false" aria-label="${escapeHtml(texts.showDetail)}">▸</button>`;
}
