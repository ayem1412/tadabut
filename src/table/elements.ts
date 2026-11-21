import { escapeHtml } from '../columns/escape';
import { splitClasses } from '../editors/classes';
import type { Texts } from '../texts/texts';
import type { ButtonIcons, TableClassNames } from './options';

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

/**
 * Edit or Delete as HTML, for DataTables' `defaultContent`, so everything in
 * it is escaped. With an icon, the label moves to `aria-label` and `title`.
 */
export function buttonHtml(
  action: Action,
  label: string,
  extra: readonly string[],
  icon?: string,
): string {
  const classes = escapeHtml(['tdb-button', `tdb-button-${action}`, ...extra].join(' '));
  const start = `<button type="button" class="${classes}" data-tdb-action="${action}"`;

  if (icon === undefined) {
    return `${start}>${escapeHtml(label)}</button>`;
  }

  return `${start} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${iconHtml(icon)}</button>`;
}

/** An icon as HTML: only its classes come from outside, and they're escaped. */
function iconHtml(icon: string): string {
  return `<i class="${escapeHtml(splitClasses(icon).join(' '))}" aria-hidden="true"></i>`;
}

/** Builds a button that replaces Edit and Delete for a while. */
function actionButton(
  action: Exclude<ButtonAction, Action>,
  label: string,
  extra: readonly string[],
  icon?: string,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('tdb-button', `tdb-button-${action}`, ...extra);
  button.dataset.tdbAction = action;
  fillButton(button, label, icon);

  return button;
}

/** Save and Cancel, for an open row. */
export function saveCancelButtons(
  texts: Texts,
  classNames: TableClassNames,
  icons: ButtonIcons,
): HTMLButtonElement[] {
  return [
    actionButton('save', texts.save, splitClasses(classNames.button, classNames.save), icons.save),
    actionButton(
      'cancel',
      texts.cancel,
      splitClasses(classNames.button, classNames.cancel),
      icons.cancel,
    ),
  ];
}

/**
 * "Delete this row? [Yes, delete] [No]". `keep` is returned on its own so it
 * can get the focus.
 */
export function deleteQuestion(
  texts: Texts,
  classNames: TableClassNames,
  icons: ButtonIcons,
): { readonly parts: readonly HTMLElement[]; readonly keep: HTMLButtonElement } {
  const question = document.createElement('span');
  question.className = 'tdb-delete-question';
  question.textContent = texts.deleteQuestion;

  const confirm = actionButton(
    'confirm',
    texts.confirm,
    splitClasses(classNames.button, classNames.confirm),
    icons.confirm,
  );
  const keep = actionButton(
    'keep',
    texts.keep,
    splitClasses(classNames.button, classNames.keep),
    icons.keep,
  );

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
export function detailToggleHtml(
  texts: Texts,
  classNames: TableClassNames,
  icons: ButtonIcons,
): string {
  const classes = ['tdb-detail-toggle', ...splitClasses(classNames.detail)].join(' ');
  const label = escapeHtml(texts.showDetail);
  const start = `<button type="button" class="${escapeHtml(classes)}" data-tdb-action="detail" aria-expanded="false" aria-label="${label}"`;

  return icons.showDetail === undefined
    ? `${start}>▸</button>`
    : `${start} title="${label}">${iconHtml(icons.showDetail)}</button>`;
}

/**
 * Shows a ▸ button open or closed: its icon for that state, or the arrow
 * when there's none. The arrow says nothing to a screen reader, so the label
 * stays in `aria-label` either way.
 */
export function setDetailToggle(
  button: HTMLButtonElement,
  open: boolean,
  texts: Texts,
  icons: ButtonIcons,
): void {
  const label = open ? texts.hideDetail : texts.showDetail;
  const icon = open ? icons.hideDetail : icons.showDetail;

  button.setAttribute('aria-expanded', String(open));
  fillButton(button, label, icon);

  if (icon === undefined) {
    button.textContent = open ? '▾' : '▸';
    button.setAttribute('aria-label', label);
  }
}

/**
 * Puts the label in a button, or the icon with the label in `aria-label`
 * and `title`. Either way it clears what was there, so a button can switch.
 */
export function fillButton(button: HTMLButtonElement, label: string, icon?: string): void {
  if (icon === undefined) {
    button.textContent = label;
    button.removeAttribute('aria-label');
    button.removeAttribute('title');
    return;
  }

  const i = document.createElement('i');
  i.classList.add(...splitClasses(icon));
  // Attributes, not `ariaHidden`/`ariaLabel`: older browsers and jsdom lack those.
  i.setAttribute('aria-hidden', 'true');

  button.replaceChildren(i);
  button.setAttribute('aria-label', label);
  button.title = label;
}
