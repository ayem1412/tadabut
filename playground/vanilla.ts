import 'datatables.net-dt';
import 'datatables.net-dt/css';

import { Tadabut, type TadabutOptions } from '../src/index';
import { columns, type Row, rows } from './data';

const container = document.querySelector<HTMLElement>('#container');
const createBtn = document.querySelector<HTMLButtonElement>('#create');
const destroyBtn = document.querySelector<HTMLButtonElement>('#destroy');
const randomDataBtn = document.querySelector<HTMLButtonElement>('#random-data');
const status = document.querySelector<HTMLElement>('#status');
const rowIdInput = document.querySelector<HTMLInputElement>('#row-id');
const editBtn = document.querySelector<HTMLButtonElement>('#edit');
const saveBtn = document.querySelector<HTMLButtonElement>('#save');
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
  !saveBtn ||
  !cancelBtn ||
  !editStatus
) {
  throw new Error('Playground: missing elements in vanilla.html');
}

let table: Tadabut<Row> | null = null;

const onSave: TadabutOptions<Row>['onSave'] = async (row) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (row.name.toLowerCase() === 'error') {
    throw new Error('The server refused this name');
  }
};

const createTable = (): Tadabut<Row> =>
  new Tadabut(container, { data: rows, columns, rowId: 'id', onSave });

const updateStatus = (): void => {
  createBtn.disabled = table !== null;
  destroyBtn.disabled = table === null;
  randomDataBtn.disabled = table === null;
  editBtn.disabled = table === null;
  saveBtn.disabled = table === null;
  cancelBtn.disabled = table === null;
  status.textContent = `Elements inside container: ${container.childElementCount}`;
};

createBtn.addEventListener('click', () => {
  table = createTable();
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

saveBtn.addEventListener('click', async () => {
  const id = rowIdInput.valueAsNumber;
  editStatus.textContent = `Saving row ${id}…`;
  const saved = (await table?.save(id)) ?? false;
  editStatus.textContent = saved ? `Row ${id} saved` : `Row ${id} not saved`;
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

table = createTable();
updateStatus();
