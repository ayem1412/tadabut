import 'datatables.net-dt';
import 'datatables.net-dt/css';
import '../shared/tadabut.css';
import '../shared/plain.css';

import {
  type EditingOptions,
  fr,
  type RowScope,
  Tadabut,
  type TadabutOptions,
} from '../../src/index';
import {
  columns,
  fakeAdd,
  fakeDelete,
  fakeSave,
  french,
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
const confirmSelect = document.querySelector<HTMLSelectElement>('#confirm');
const totalRowsSelect = document.querySelector<HTMLSelectElement>('#total-rows');
const selectionSelect = document.querySelector<HTMLSelectElement>('#selection');
const status = document.querySelector<HTMLElement>('#status');
const selected = document.querySelector<HTMLElement>('#selected');

if (
  !container ||
  !createBtn ||
  !destroyBtn ||
  !randomDataBtn ||
  !addBtn ||
  !modeSelect ||
  !buttonsCheckbox ||
  !frenchCheckbox ||
  !confirmSelect ||
  !totalRowsSelect ||
  !selectionSelect ||
  !status ||
  !selected
) {
  throw new Error('Playground: missing elements in vanilla/index.html');
}

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

/** The `selection` picked in the toolbar. */
const selection = (): TadabutOptions<Row>['selection'] =>
  selectionSelect.value === 'off' ? false : { checkAll: selectionSelect.value as RowScope };

const createTable = (): Tadabut<Row> => {
  const editing: EditingOptions = {
    mode: modeSelect.value === 'multiple' ? 'multiple' : 'single',
    button: buttonsCheckbox.checked,
  };

  return new Tadabut(container, {
    data: rows,
    columns,
    rowId: 'id',
    onSave: fakeSave,
    onAdd: fakeAdd,
    onDelete: fakeDelete,
    confirmDelete: confirmDelete(),
    totalRows: totalRowsSelect.value as RowScope,
    selection: selection(),
    onSelect: (picked) => {
      selected.textContent = `Selected: ${picked.map((row) => row.name).join(', ') || 'none'}`;
    },
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
confirmSelect.addEventListener('change', recreate);
totalRowsSelect.addEventListener('change', recreate);
selectionSelect.addEventListener('change', recreate);

table = createTable();
updateStatus();

// For the browser console. A getter, so it follows Create and Destroy.
Object.defineProperty(window, 'table', { get: () => table });
