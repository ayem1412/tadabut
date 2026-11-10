import 'bootstrap/dist/css/bootstrap.min.css';
import 'datatables.net-bs5';
import 'datatables.net-bs5/css';
// After Bootstrap, so these win.
import '../shared/tadabut.css';
import './bootstrap.css';

import {
  type EditingOptions,
  fr,
  type RowScope,
  type TableClassNames,
  Tadabut,
  type TadabutOptions,
} from '../../src/index';
import {
  fakeAdd,
  fakeDelete,
  fakeSave,
  french,
  makeColumns,
  type Row,
  rows,
  settings,
} from '../shared/data';

const container = document.querySelector<HTMLElement>('#container');
const createBtn = document.querySelector<HTMLButtonElement>('#create');
const destroyBtn = document.querySelector<HTMLButtonElement>('#destroy');
const randomDataBtn = document.querySelector<HTMLButtonElement>('#random-data');
const addBtn = document.querySelector<HTMLButtonElement>('#add');
const modeSelect = document.querySelector<HTMLSelectElement>('#mode');
const buttonsCheckbox = document.querySelector<HTMLInputElement>('#buttons');
const frenchCheckbox = document.querySelector<HTMLInputElement>('#french');
const doubleClickCheckbox = document.querySelector<HTMLInputElement>('#double-click');
const lockCheckbox = document.querySelector<HTMLInputElement>('#lock');
const confirmSelect = document.querySelector<HTMLSelectElement>('#confirm');
const totalRowsSelect = document.querySelector<HTMLSelectElement>('#total-rows');
const selectionSelect = document.querySelector<HTMLSelectElement>('#selection');
const status = document.querySelector<HTMLElement>('#status');
const selected = document.querySelector<HTMLElement>('#selected');
const events = document.querySelector<HTMLElement>('#events');

if (
  !container ||
  !createBtn ||
  !destroyBtn ||
  !randomDataBtn ||
  !addBtn ||
  !modeSelect ||
  !buttonsCheckbox ||
  !frenchCheckbox ||
  !doubleClickCheckbox ||
  !lockCheckbox ||
  !confirmSelect ||
  !totalRowsSelect ||
  !selectionSelect ||
  !status ||
  !selected ||
  !events
) {
  throw new Error('Playground: missing elements in bootstrap/index.html');
}

const classNames: TableClassNames = {
  table: 'table table-striped table-hover align-middle',
  button: 'btn btn-sm',
  edit: 'btn-outline-primary',
  save: 'btn-primary',
  cancel: 'btn-outline-secondary',
  delete: 'btn-outline-danger',
  confirm: 'btn-danger',
  keep: 'btn-outline-secondary',
  select: 'form-check-input',
};

const columns = makeColumns({
  input: 'form-control form-control-sm',
  select: 'form-select form-select-sm',
  checkbox: 'form-check-input',
});

let table: Tadabut<Row> | null = null;

/** The `confirmDelete` picked in the toolbar. */
const confirmDelete = (): TadabutOptions<Row>['confirmDelete'] => {
  switch (confirmSelect.value) {
    case 'never':
      return false;
    case 'popup':
      return (row) => window.confirm(`Delete ${row.name}?`);
    default:
      return undefined;
  }
};

/** Puts an event at the top of the list under the table, keeping the last 10. */
const log = (text: string): void => {
  const item = document.createElement('li');
  item.textContent = text;
  events.prepend(item);
  events.querySelector('li:nth-child(11)')?.remove();
};

/** The `selection` picked in the toolbar. */
const selection = (): TadabutOptions<Row>['selection'] =>
  selectionSelect.value === 'off' ? false : { checkAll: selectionSelect.value as RowScope };

const createTable = (): Tadabut<Row> => {
  const editing: EditingOptions = {
    mode: modeSelect.value === 'multiple' ? 'multiple' : 'single',
    button: buttonsCheckbox.checked,
    doubleClick: doubleClickCheckbox.checked,
  };

  return new Tadabut(container, {
    data: rows,
    columns,
    rowId: 'id',
    classNames,
    onSave: fakeSave,
    onAdd: fakeAdd,
    onDelete: fakeDelete,
    confirmDelete: confirmDelete(),
    totalRows: totalRowsSelect.value as RowScope,
    selection: selection(),
    onSelect: (picked) => {
      selected.textContent = `Selected: ${picked.map((row) => row.name).join(', ') || 'none'}`;
    },
    // Read on each edit, so the switch works without a rebuild.
    onEditStart: (row) => {
      const locked = lockCheckbox.checked && row.id === 7;
      log(locked ? `onEditStart: ${row.name} is locked` : `onEditStart: ${row.name}`);
      return !locked;
    },
    onSaved: (row, { previous }) => log(`onSaved: ${previous.name} → ${row.name}`),
    onAdded: (row) => log(`onAdded: ${row.name} (id ${row.id})`),
    onDeleted: (row) => log(`onDeleted: ${row.name}`),
    onRowClick: (row) => log(`onRowClick: ${row.name}`),
    onRowDoubleClick: (row) => log(`onRowDoubleClick: ${row.name}`),
    editing,
    dataTables: frenchCheckbox.checked ? { ...settings, language: french } : settings,
    texts: frenchCheckbox.checked ? fr : undefined,
  });
};

const updateStatus = (): void => {
  createBtn.disabled = table !== null;
  destroyBtn.disabled = table === null;
  randomDataBtn.disabled = table === null;
  addBtn.disabled = table === null;
  status.textContent = `Elements inside container: ${container.childElementCount}`;
};

const recreate = (): void => {
  if (table === null) {
    return;
  }

  table.destroy();
  selected.textContent = '';
  table = createTable();
  updateStatus();
};

createBtn.addEventListener('click', () => {
  table = createTable();
  updateStatus();
});

destroyBtn.addEventListener('click', () => {
  table?.destroy();
  table = null;
  selected.textContent = '';
  updateStatus();
});

randomDataBtn.addEventListener('click', () => {
  table?.setData(rows.filter(() => Math.random() > 0.3));
});

// Starts in Morocco, so the cities load right away.
addBtn.addEventListener('click', () => {
  table?.add({ country: 'MA' });
});

modeSelect.addEventListener('change', recreate);
buttonsCheckbox.addEventListener('change', recreate);
frenchCheckbox.addEventListener('change', recreate);
doubleClickCheckbox.addEventListener('change', recreate);
confirmSelect.addEventListener('change', recreate);
totalRowsSelect.addEventListener('change', recreate);
selectionSelect.addEventListener('change', recreate);

table = createTable();
updateStatus();

// For the browser console. A getter, so it follows Create and Destroy.
Object.defineProperty(window, 'table', { get: () => table });
