import { afterEach, describe, expect, it } from 'vitest';

import { type Column, type TableClassNames, Tadabut } from '../../src/index';

type Row = { id: number; name: string };

const rows: Row[] = [
  { id: 1, name: 'Amina' },
  { id: 2, name: 'Salma' },
];

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
];

function setup(classNames?: TableClassNames) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const table = new Tadabut(container, { data: rows, rowId: 'id', columns, classNames });
  const tableEl = container.querySelector('table') as HTMLTableElement;

  return { container, table, tableEl };
}

describe('classNames', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds the table classes to the <table>', () => {
    const { tableEl } = setup({ table: 'table table-striped' });

    expect(tableEl.classList.contains('table')).toBe(true);
    expect(tableEl.classList.contains('table-striped')).toBe(true);
  });

  it('adds nothing without classNames', () => {
    const { tableEl } = setup();

    expect(tableEl.classList.contains('table')).toBe(false);
  });

  it('ignores extra spaces', () => {
    const { tableEl } = setup({ table: '  table   table-hover ' });

    expect(tableEl.classList.contains('table')).toBe(true);
    expect(tableEl.classList.contains('table-hover')).toBe(true);
  });

  it('keeps the table classes next to the ones DataTables adds', () => {
    const { tableEl } = setup({ table: 'table' });

    expect(tableEl.classList.contains('dataTable')).toBe(true);
    expect(tableEl.classList.contains('table')).toBe(true);
  });

  const bootstrap: TableClassNames = {
    button: 'btn btn-sm',
    edit: 'btn-outline-primary',
    save: 'btn-primary',
    cancel: 'btn-outline-secondary',
  };

  const button = (container: HTMLElement, action: string) =>
    container.querySelector(`tbody tr:first-child [data-tdb-action="${action}"]`) as HTMLElement;

  it('adds button and edit to the Edit button, after the tdb- classes', () => {
    const { container } = setup(bootstrap);

    expect(button(container, 'edit').className).toBe(
      'tdb-button tdb-button-edit btn btn-sm btn-outline-primary',
    );
  });

  it('adds button and save or cancel to the Save and Cancel buttons', () => {
    const { container, table } = setup(bootstrap);

    table.edit(1);

    expect(button(container, 'save').className).toBe(
      'tdb-button tdb-button-save btn btn-sm btn-primary',
    );
    expect(button(container, 'cancel').className).toBe(
      'tdb-button tdb-button-cancel btn btn-sm btn-outline-secondary',
    );
  });

  it('keeps the buttons as they were without classNames', () => {
    const { container, table } = setup();
    expect(button(container, 'edit').className).toBe('tdb-button tdb-button-edit');

    table.edit(1);

    expect(button(container, 'save').className).toBe('tdb-button tdb-button-save');
    expect(button(container, 'cancel').className).toBe('tdb-button tdb-button-cancel');
  });

  it('gives the Edit button back its classes after a cancel', () => {
    const { container, table } = setup(bootstrap);
    table.edit(1);

    table.cancel(1);

    expect(button(container, 'edit').classList.contains('btn-outline-primary')).toBe(true);
  });

  it('escapes the Edit button classes, so a quote cannot break the HTML', () => {
    const { container } = setup({ button: 'a"b x" onclick="alert(1)' });
    const edit = button(container, 'edit');

    expect(container.querySelectorAll('tbody tr:first-child button')).toHaveLength(1);
    expect(edit.hasAttribute('onclick')).toBe(false);
    expect(edit.classList.contains('a"b')).toBe(true);
  });
});

describe('styling hooks', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const firstRow = (container: HTMLElement) =>
    container.querySelector('tbody tr') as HTMLTableRowElement;

  it('marks a row with tdb-row-editing while it is edited', () => {
    const { container, table } = setup();

    table.edit(1);
    expect(firstRow(container).classList.contains('tdb-row-editing')).toBe(true);

    table.cancel(1);
    expect(firstRow(container).classList.contains('tdb-row-editing')).toBe(false);
  });

  it('removes tdb-row-editing after a save', async () => {
    const { container, table } = setup();
    table.edit(1);

    await table.save(1);

    expect(firstRow(container).classList.contains('tdb-row-editing')).toBe(false);
  });

  it('puts tdb-save-error-message on the save error message itself', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const table = new Tadabut(container, {
      data: rows,
      rowId: 'id',
      columns,
      onSave: () => {
        throw new Error('Refused');
      },
    });
    table.edit(1);

    await table.save(1);

    const message = container.querySelector('tr.tdb-save-error .tdb-save-error-message');
    expect(message?.textContent).toBe('Refused');
  });
});
