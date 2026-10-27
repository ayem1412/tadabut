import 'datatables.net-dt';
import 'datatables.net-dt/css';

import { Tadabut } from '../src/index';
import { columns, type Row, rows } from './data';

const container = document.querySelector<HTMLElement>('#container');
const createBtn = document.querySelector<HTMLButtonElement>('#create');
const destroyBtn = document.querySelector<HTMLButtonElement>('#destroy');
const randomDataBtn = document.querySelector<HTMLButtonElement>('#random-data');
const status = document.querySelector<HTMLElement>('#status');
const rowIdInput = document.querySelector<HTMLInputElement>('#row-id');
const editBtn = document.querySelector<HTMLButtonElement>('#edit');
const cancelBtn = document.querySelector<HTMLButtonElement>('#cancel');
const editStatus = document.querySelector<HTMLElement>('#edit-status');

if (
  !container ||
  !createBtn ||
  !destroyBtn ||
  !randomDataBtn ||
  !status ||
  !rowIdInput ||
  !editBtn ||
  !cancelBtn ||
  !editStatus
) {
  throw new Error('Playground: missing elements in vanilla.html');
}

let table: Tadabut<Row> | null = null;

const updateStatus = (): void => {
  createBtn.disabled = table !== null;
  destroyBtn.disabled = table === null;
  randomDataBtn.disabled = table === null;
  editBtn.disabled = table === null;
  cancelBtn.disabled = table === null;
  status.textContent = `Elements inside container: ${container.childElementCount}`;
};

createBtn.addEventListener('click', () => {
  table = new Tadabut(container, { data: rows, columns, rowId: 'id' });
  updateStatus();
});

randomDataBtn.addEventListener('click', () => {
  table?.setData(rows.filter(() => Math.random() > 0.3));
});

editBtn.addEventListener('click', () => {
  const id = rowIdInput.valueAsNumber;
  const started = table?.edit(id) ?? false;
  editStatus.textContent = started
    ? `Editing row ${id}`
    : `Can't edit row ${id} (missing, another row is open, or not shown yet)`;
});

cancelBtn.addEventListener('click', () => {
  const id = rowIdInput.valueAsNumber;
  table?.cancel(id);
  editStatus.textContent = `Row ${id} is not being edited`;
});

destroyBtn.addEventListener('click', () => {
  table?.destroy();
  table = null;
  updateStatus();
});

table = new Tadabut(container, { data: rows, columns, rowId: 'id' });
updateStatus();
