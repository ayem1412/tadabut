import 'datatables.net-dt';
import 'datatables.net-dt/css';

import { type EditingOptions, fr, Tadabut, type TadabutOptions } from '../src/index';
import { columns, fakeDelete, fakeSave, french, type Row, rows, settings } from './data';

const container = document.querySelector<HTMLElement>('#container');
const createBtn = document.querySelector<HTMLButtonElement>('#create');
const destroyBtn = document.querySelector<HTMLButtonElement>('#destroy');
const randomDataBtn = document.querySelector<HTMLButtonElement>('#random-data');
const modeSelect = document.querySelector<HTMLSelectElement>('#mode');
const buttonsCheckbox = document.querySelector<HTMLInputElement>('#buttons');
const frenchCheckbox = document.querySelector<HTMLInputElement>('#french');
const confirmSelect = document.querySelector<HTMLSelectElement>('#confirm');
const status = document.querySelector<HTMLElement>('#status');

if (
  !container ||
  !createBtn ||
  !destroyBtn ||
  !randomDataBtn ||
  !modeSelect ||
  !buttonsCheckbox ||
  !frenchCheckbox ||
  !confirmSelect ||
  !status
) {
  throw new Error('Playground: missing elements in vanilla.html');
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
    onDelete: fakeDelete,
    confirmDelete: confirmDelete(),
    editing,
    dataTables: frenchCheckbox.checked ? { ...settings, language: french } : settings,
    texts: frenchCheckbox.checked ? fr : undefined,
  });
};

const updateStatus = (): void => {
  createBtn.disabled = table !== null;
  destroyBtn.disabled = table === null;
  randomDataBtn.disabled = table === null;
  status.textContent = `Elements inside container: ${container.childElementCount}`;
};

const recreate = (): void => {
  if (table === null) {
    return;
  }

  table.destroy();
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
  updateStatus();
});

randomDataBtn.addEventListener('click', () => {
  table?.setData(rows.filter(() => Math.random() > 0.3));
});

modeSelect.addEventListener('change', recreate);
buttonsCheckbox.addEventListener('change', recreate);
frenchCheckbox.addEventListener('change', recreate);
confirmSelect.addEventListener('change', recreate);

table = createTable();
updateStatus();
