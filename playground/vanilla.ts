import 'datatables.net-dt';
import 'datatables.net-dt/css';

import { Tadabut } from '../src/index';
import { columns, rows } from './data';

const container = document.querySelector<HTMLElement>('#container');
const createBtn = document.querySelector<HTMLButtonElement>('#create');
const destroyBtn = document.querySelector<HTMLButtonElement>('#destroy');
const status = document.querySelector<HTMLElement>('#status');

if (!container || !createBtn || !destroyBtn || !status) {
  throw new Error('Playground: missing elements in vanilla.html');
}

let table: Tadabut | null = null;

const updateStatus = (): void => {
  createBtn.disabled = table !== null;
  destroyBtn.disabled = table === null;
  status.textContent = `Elements inside container: ${container.childElementCount}`;
};

createBtn.addEventListener('click', () => {
  table = new Tadabut(container, rows, columns);
  updateStatus();
});

destroyBtn.addEventListener('click', () => {
  table?.destroy();
  table = null;
  updateStatus();
});

table = new Tadabut(container, rows, columns);
updateStatus();
