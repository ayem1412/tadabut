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
  type TotalScope,
} from '../../src/index';
import {
  type Details,
  fakeAdd,
  fakeDelete,
  fakeSave,
  fetchDetails,
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
const insertRowBtn = document.querySelector<HTMLButtonElement>('#insert-row');
const updateRowBtn = document.querySelector<HTMLButtonElement>('#update-row');
const removeRowBtn = document.querySelector<HTMLButtonElement>('#remove-row');
const logTotalsBtn = document.querySelector<HTMLButtonElement>('#log-totals');
const modeSelect = document.querySelector<HTMLSelectElement>('#mode');
const buttonsCheckbox = document.querySelector<HTMLInputElement>('#buttons');
const frenchCheckbox = document.querySelector<HTMLInputElement>('#french');
const doubleClickCheckbox = document.querySelector<HTMLInputElement>('#double-click');
const detailsCheckbox = document.querySelector<HTMLInputElement>('#details');
const currentRowCheckbox = document.querySelector<HTMLInputElement>('#current-row');
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
  !insertRowBtn ||
  !updateRowBtn ||
  !removeRowBtn ||
  !logTotalsBtn ||
  !modeSelect ||
  !buttonsCheckbox ||
  !frenchCheckbox ||
  !doubleClickCheckbox ||
  !detailsCheckbox ||
  !currentRowCheckbox ||
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
  detail: 'text-body-secondary',
  current: 'table-active',
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

/** A row's details as a list: built with textContent, since it comes from a server. */
const detailsList = (details: Details): HTMLElement => {
  const list = document.createElement('dl');
  list.className = 'tdb-details small';

  for (const [label, value] of [
    ['Email', details.email],
    ['Phone', details.phone],
    ['Manager', details.manager],
  ]) {
    list.append(
      Object.assign(document.createElement('dt'), { textContent: label }),
      Object.assign(document.createElement('dd'), { textContent: value }),
    );
  }

  return list;
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
    totalRows: totalRowsSelect.value as TotalScope,
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
    currentRow: currentRowCheckbox.checked,
    onCurrentChange: (row) => log(`onCurrentChange: ${row?.name ?? 'none'}`),
    onRowClick: (row) => log(`onRowClick: ${row.name}`),
    onRowDoubleClick: (row) => log(`onRowDoubleClick: ${row.name}`),
    detail: detailsCheckbox.checked
      ? async (row, { signal }) => detailsList(await fetchDetails(row, signal))
      : undefined,
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

  for (const button of [insertRowBtn, updateRowBtn, removeRowBtn, logTotalsBtn]) {
    button.disabled = table === null;
  }
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

/** Ids for rows inserted from code, far from the real ones. */
let insertedId = 100;

// Like a row the server pushed: no onAdd, and the page doesn't move.
insertRowBtn.addEventListener('click', () => {
  if (table === null) {
    return;
  }

  const [first] = table.getData();

  if (first === undefined) {
    return;
  }

  insertedId += 1;
  table.insertRow({
    ...first,
    id: insertedId,
    code: `EMP-${insertedId}`,
    name: `Inserted ${insertedId}`,
  });
  log(`insertRow: Inserted ${insertedId}`);
});

updateRowBtn.addEventListener('click', () => {
  const [first] = table?.getData('page') ?? [];

  if (table === null || first === undefined) {
    return;
  }

  // Like the server telling us about a raise: the cell and the total both follow.
  const salary = (first.salary ?? 0) + 1000;
  const updated = table.updateRow({ ...first, salary });

  log(
    updated
      ? `updateRow: ${first.name} now earns ${salary}`
      : 'updateRow: refused, the row is being edited',
  );
});

removeRowBtn.addEventListener('click', () => {
  const last = table?.getData('page').at(-1);

  if (table === null || last === undefined) {
    return;
  }

  log(
    table.removeRow(last.id)
      ? `removeRow: ${last.name}`
      : 'removeRow: refused, the row is being edited',
  );
});

logTotalsBtn.addEventListener('click', () => {
  log(`getTotals: ${JSON.stringify(table?.getTotals() ?? {})}`);
});

modeSelect.addEventListener('change', recreate);
buttonsCheckbox.addEventListener('change', recreate);
frenchCheckbox.addEventListener('change', recreate);
doubleClickCheckbox.addEventListener('change', recreate);
detailsCheckbox.addEventListener('change', recreate);
currentRowCheckbox.addEventListener('change', recreate);
confirmSelect.addEventListener('change', recreate);
/**
 * "The ticked rows" needs the checkboxes, or Tadabut throws. So that choice
 * is only offered while they're on, and turning them off falls back to the
 * searched rows.
 */
const fitTotalsToCheckboxes = (): void => {
  const off = selectionSelect.value === 'off';
  const ticked = totalRowsSelect.querySelector<HTMLOptionElement>('option[value="selected"]');

  if (ticked !== null) {
    ticked.disabled = off;
  }

  if (off && totalRowsSelect.value === 'selected') {
    totalRowsSelect.value = 'searched';
  }
};

fitTotalsToCheckboxes();

totalRowsSelect.addEventListener('change', recreate);
selectionSelect.addEventListener('change', () => {
  fitTotalsToCheckboxes();
  recreate();
});

table = createTable();
updateStatus();

// For the browser console. A getter, so it follows Create and Destroy.
Object.defineProperty(window, 'table', { get: () => table });
