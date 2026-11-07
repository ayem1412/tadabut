import 'bootstrap/dist/css/bootstrap.min.css';
import 'datatables.net-bs5';
import 'datatables.net-bs5/css';
// After Bootstrap, so these win.
import '../shared/tadabut.css';
import './bootstrap.css';

import { type TableClassNames, Tadabut } from '../../src/index';
import { fakeAdd, fakeDelete, fakeSave, makeColumns, rows } from '../shared/data';

const container = document.querySelector<HTMLElement>('#container');
const addBtn = document.querySelector<HTMLButtonElement>('#add');

if (!container || !addBtn) {
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
};

const columns = makeColumns({
  input: 'form-control form-control-sm',
  select: 'form-select form-select-sm',
  checkbox: 'form-check-input',
});

const table = new Tadabut(container, {
  data: rows,
  columns,
  rowId: 'id',
  onSave: fakeSave,
  onAdd: fakeAdd,
  onDelete: fakeDelete,
  classNames,
});

addBtn.addEventListener('click', () => {
  table.add({ country: 'MA' });
});
