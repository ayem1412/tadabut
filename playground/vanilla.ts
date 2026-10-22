import 'datatables.net-dt';
import 'datatables.net-dt/css';

import { Tadabut } from '../src/index';
import { columns, type Row, rows } from './data';

const container = document.querySelector<HTMLElement>('#container');
const createBtn = document.querySelector<HTMLButtonElement>('#create');
const destroyBtn = document.querySelector<HTMLButtonElement>('#destroy');
const randomDataBtn = document.querySelector<HTMLButtonElement>('#random-data');
const status = document.querySelector<HTMLElement>('#status');

if (!container || !createBtn || !destroyBtn || !randomDataBtn || !status) {
  throw new Error('Playground: missing elements in vanilla.html');
}

let table: Tadabut<Row> | null = null;

const updateStatus = (): void => {
  createBtn.disabled = table !== null;
  destroyBtn.disabled = table === null;
  randomDataBtn.disabled = table === null;
  status.textContent = `Elements inside container: ${container.childElementCount}`;
};

createBtn.addEventListener('click', () => {
  table = new Tadabut(container, { data: rows, columns });
  updateStatus();
});

randomDataBtn.addEventListener('click', () => {
  table?.setData(rows.filter(() => Math.random() > 0.3));
});

destroyBtn.addEventListener('click', () => {
  table?.destroy();
  table = null;
  updateStatus();
});

table = new Tadabut(container, { data: rows, columns });
updateStatus();
