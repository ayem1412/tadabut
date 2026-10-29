import 'datatables.net-dt';
import 'datatables.net-dt/css';

import { type EditingOptions, Tadabut, type TadabutOptions } from '../src/index';
import { columns, type Row, rows } from './data';

const container = document.querySelector<HTMLElement>('#container');
const createBtn = document.querySelector<HTMLButtonElement>('#create');
const destroyBtn = document.querySelector<HTMLButtonElement>('#destroy');
const randomDataBtn = document.querySelector<HTMLButtonElement>('#random-data');
const modeSelect = document.querySelector<HTMLSelectElement>('#mode');
const buttonsCheckbox = document.querySelector<HTMLInputElement>('#buttons');
const status = document.querySelector<HTMLElement>('#status');

if (
  !container ||
  !createBtn ||
  !destroyBtn ||
  !randomDataBtn ||
  !modeSelect ||
  !buttonsCheckbox ||
  !status
) {
  throw new Error('Playground: missing elements in vanilla.html');
}

let table: Tadabut<Row> | null = null;

/** A fake server: takes 1 second, and refuses the name "error". */
const onSave: TadabutOptions<Row>['onSave'] = async (row) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (row.name.toLowerCase() === 'error') {
    throw new Error('The server refused this name');
  }
};

const createTable = (): Tadabut<Row> => {
  const editing: EditingOptions = {
    mode: modeSelect.value === 'multiple' ? 'multiple' : 'single',
    button: buttonsCheckbox.checked,
  };

  return new Tadabut(container, { data: rows, columns, rowId: 'id', onSave, editing });
};

const updateStatus = (): void => {
  createBtn.disabled = table !== null;
  destroyBtn.disabled = table === null;
  randomDataBtn.disabled = table === null;
  status.textContent = `Elements inside container: ${container.childElementCount}`;
};

/** The editing options are only read when a table is created, so rebuild it. */
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

table = createTable();
updateStatus();
