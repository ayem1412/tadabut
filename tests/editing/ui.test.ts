import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Column, type EditingOptions, Tadabut } from '../../src/index';

type Row = { id: number; name: string };

const rows: Row[] = [
  { id: 1, name: 'Amina' },
  { id: 2, name: 'Salma' },
];

const editable: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
];

function setup(columns: Column<Row>[] = editable, editing?: EditingOptions) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const table = new Tadabut(container, { data: rows, rowId: 'id', columns, editing });

  const headers = () => [...container.querySelectorAll('thead th')];
  const editButtons = () => [
    ...container.querySelectorAll<HTMLButtonElement>('tbody [data-tdb-action="edit"]'),
  ];

  return { container, table, headers, editButtons };
}

describe('the actions column', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds an empty column at the end', () => {
    const { headers } = setup();

    expect(headers().map((th) => th.textContent)).toEqual(['ID', 'Name', '']);
    expect(headers()[2]?.classList.contains('tdb-actions')).toBe(true);
  });

  it('puts an Edit button in each row', () => {
    const { editButtons } = setup();

    expect(editButtons()).toHaveLength(2);
    expect(editButtons()[0]?.textContent).toBe('Edit');
    expect(editButtons()[0]?.type).toBe('button');
    expect(editButtons()[0]?.className).toBe('tdb-button tdb-button-edit');
  });

  it('cannot be sorted', () => {
    const { headers, container } = setup();
    const firstName = () => container.querySelector('tbody td:nth-child(2)')?.textContent;

    (headers()[2] as HTMLElement).click();

    expect(firstName()).toBe('Amina');
    expect(headers()[2]?.classList.contains('dt-orderable-none')).toBe(true);
  });

  it('is not searched', () => {
    const { container } = setup();
    const search = container.querySelector('.dt-search input') as HTMLInputElement;

    search.value = 'Edit';
    search.dispatchEvent(new Event('input'));

    expect(container.querySelector('tbody td.dt-empty')).not.toBeNull();
  });

  it('is left out when button is false', () => {
    const { headers, editButtons } = setup(editable, { button: false });

    expect(headers()).toHaveLength(2);
    expect(editButtons()).toHaveLength(0);
  });

  it('is left out when no column has an editor', () => {
    const { headers } = setup([
      { title: 'ID', prop: 'id' },
      { title: 'Name', prop: 'name' },
    ]);

    expect(headers()).toHaveLength(2);
  });

  it('keeps editing the right cells', () => {
    const { table, container } = setup();
    table.edit(1);

    const cells = [...container.querySelectorAll('tbody tr:first-child td')];

    expect(cells[1]?.querySelector('input')?.value).toBe('Amina');
    expect(cells[2]?.querySelector('[data-tdb-action="save"]')).not.toBeNull();
  });

  it('shows Save and Cancel while a row is being edited', () => {
    const { table, container } = setup();
    table.edit(1);

    const buttons = [
      ...container.querySelectorAll<HTMLButtonElement>(
        'tbody tr:first-child td.tdb-actions button',
      ),
    ];

    expect(buttons.map((button) => button.textContent)).toEqual(['Save', 'Cancel']);
    expect(buttons.map((button) => button.dataset.tdbAction)).toEqual(['save', 'cancel']);
    expect(buttons.map((button) => button.className)).toEqual([
      'tdb-button tdb-button-save',
      'tdb-button tdb-button-cancel',
    ]);
    expect(buttons.every((button) => button.type === 'button')).toBe(true);
  });

  it('leaves the other rows with their Edit button', () => {
    const { table, container } = setup();
    table.edit(1);

    const secondRow = container.querySelector('tbody tr:nth-child(2) td.tdb-actions');

    expect(secondRow?.textContent).toBe('Edit');
  });

  it('shows Edit again after cancel', () => {
    const { table, container } = setup();
    table.edit(1);

    table.cancel(1);

    expect(container.querySelector('tbody tr:first-child td.tdb-actions')?.textContent).toBe(
      'Edit',
    );
  });

  it('shows Edit again after a save', async () => {
    const { table, container } = setup();
    table.edit(1);

    expect(await table.save(1)).toBe(true);

    expect(container.querySelector('tbody tr:first-child td.tdb-actions')?.textContent).toBe(
      'Edit',
    );
  });

  it('keeps Save and Cancel after a failed save', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const table = new Tadabut(container, {
      data: rows,
      rowId: 'id',
      columns: editable,
      onSave: () => {
        throw new Error('No');
      },
    });
    table.edit(1);

    expect(await table.save(1)).toBe(false);

    expect(container.querySelector('tbody tr:first-child td.tdb-actions')?.textContent).toBe(
      'SaveCancel',
    );
  });

  it('edits without buttons when button is false', () => {
    const { table, container } = setup(editable, { button: false });

    expect(table.edit(1)).toBe(true);
    expect(container.querySelectorAll('tbody button')).toHaveLength(0);
  });
});

describe('clicking the buttons', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function click(container: HTMLElement, row: number, action: string): void {
    container
      .querySelector<HTMLButtonElement>(`tbody tr:nth-child(${row}) [data-tdb-action="${action}"]`)
      ?.click();
  }

  it('Edit opens the row it is in', () => {
    const { table, container } = setup();

    click(container, 2, 'edit');

    expect(table.isEditing(2)).toBe(true);
    expect(table.isEditing(1)).toBe(false);
  });

  it('Cancel closes the row and keeps the old values', () => {
    const { table, container } = setup();
    click(container, 1, 'edit');
    (container.querySelector('tbody input') as HTMLInputElement).value = 'Nadia';

    click(container, 1, 'cancel');

    expect(table.isEditing(1)).toBe(false);
    expect(container.querySelector('tbody td:nth-child(2)')?.textContent).toBe('Amina');
  });

  it('Save saves the row', async () => {
    const onSave = vi.fn((_row: Row) => {});
    const container = document.createElement('div');
    document.body.appendChild(container);
    const table = new Tadabut(container, { data: rows, rowId: 'id', columns: editable, onSave });
    click(container, 1, 'edit');
    (container.querySelector('tbody input') as HTMLInputElement).value = 'Nadia';

    click(container, 1, 'save');
    await vi.waitFor(() => expect(table.isEditing(1)).toBe(false));

    expect(onSave).toHaveBeenCalledWith({ id: 1, name: 'Nadia' }, { previous: rows[0] });
    expect(container.querySelector('tbody td:nth-child(2)')?.textContent).toBe('Nadia');
  });

  it('works on rows sorted into a new order', async () => {
    const { table, container } = setup();
    // Sort by Name, descending: Salma comes first. DataTables sorts on the
    // next tick, so wait after each click.
    const nameHeader = container.querySelectorAll<HTMLElement>('thead th')[1] as HTMLElement;
    nameHeader.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    nameHeader.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector('tbody td:nth-child(2)')?.textContent).toBe('Salma');

    click(container, 1, 'edit');

    expect(table.isEditing(2)).toBe(true);
  });

  it('ignores clicks outside the buttons', () => {
    const { table, container } = setup();

    (container.querySelector('tbody td') as HTMLElement).click();

    expect(table.isEditing(1)).toBe(false);
  });
});

describe('the keyboard', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function press(target: Element, key: string, handled = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

    if (handled) {
      event.preventDefault();
    }

    target.dispatchEvent(event);
    return event;
  }

  function nameInput(container: HTMLElement): HTMLInputElement {
    return container.querySelector('tbody input') as HTMLInputElement;
  }

  it('Enter in an input saves the row', async () => {
    const { table, container } = setup();
    table.edit(1);
    nameInput(container).value = 'Nadia';

    const event = press(nameInput(container), 'Enter');
    await vi.waitFor(() => expect(table.isEditing(1)).toBe(false));

    expect(event.defaultPrevented).toBe(true);
    expect(container.querySelector('tbody td:nth-child(2)')?.textContent).toBe('Nadia');
  });

  it('Escape in an input cancels the row', () => {
    const { table, container } = setup();
    table.edit(1);
    nameInput(container).value = 'Nadia';

    press(nameInput(container), 'Escape');

    expect(table.isEditing(1)).toBe(false);
    expect(container.querySelector('tbody td:nth-child(2)')?.textContent).toBe('Amina');
  });

  it('works without the buttons', () => {
    const { table, container } = setup(editable, { button: false });
    table.edit(1);

    press(nameInput(container), 'Escape');

    expect(table.isEditing(1)).toBe(false);
  });

  it('ignores a key something else already handled', async () => {
    const { table, container } = setup();
    table.edit(1);

    press(nameInput(container), 'Enter', true);
    press(nameInput(container), 'Escape', true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(table.isEditing(1)).toBe(true);
  });

  it('leaves Enter on the buttons to the buttons', async () => {
    const { table, container } = setup();
    table.edit(1);
    const cancel = container.querySelector('[data-tdb-action="cancel"]') as HTMLElement;

    const event = press(cancel, 'Enter');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(event.defaultPrevented).toBe(false);
    expect(table.isEditing(1)).toBe(true);
  });

  it('ignores keys in rows that are not being edited', () => {
    const { container } = setup();
    const cell = container.querySelector('tbody td') as HTMLElement;

    const event = press(cell, 'Enter');

    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores other keys', () => {
    const { table, container } = setup();
    table.edit(1);

    press(nameInput(container), 'a');

    expect(table.isEditing(1)).toBe(true);
  });
});

describe('after destroy', () => {
  it('stops listening to clicks and keys', () => {
    const { table, container } = setup();
    const tableEl = container.querySelector('table') as HTMLTableElement;
    const remove = vi.spyOn(tableEl, 'removeEventListener');

    table.destroy();

    expect(remove).toHaveBeenCalledWith('click', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
    document.body.innerHTML = '';
  });

  it('ignores a click on a button kept from the old table', () => {
    const { table, container } = setup();
    const edit = container.querySelector('[data-tdb-action="edit"]') as HTMLElement;

    table.destroy();

    expect(() => edit.click()).not.toThrow();
    expect(table.isEditing(1)).toBe(false);
    document.body.innerHTML = '';
  });
});
