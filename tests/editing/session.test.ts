import { describe, expect, it, vi } from 'vitest';

import { EditSession } from '../../src/editing/session';
import type { Column, EditorInstance } from '../../src/index';

type Row = { id: number; name: string; note: string; createdAt: string };

const row: Row = { id: 1, name: 'Amina', note: 'old', createdAt: '2024-01-05' };

function setup() {
  const destroy = vi.fn();
  const noteEditor: EditorInstance<string> = {
    element: document.createElement('span'),
    getValue: () => 'new',
    setValue: vi.fn(),
    focus: vi.fn(),
    destroy,
  };

  const columns: Column<Row>[] = [
    { title: 'ID', prop: 'id' },
    { title: 'Name', prop: 'name', editor: { type: 'text' } },
    {
      title: 'Note',
      prop: 'note',
      editor: { type: 'custom', create: () => noteEditor },
    },
  ];

  const cells = columns.map((column) => {
    const cell = document.createElement('td');
    cell.textContent = 'text';
    return { column, cell };
  });

  const session = new EditSession(row, cells);
  const [idCell, nameCell, noteCell] = cells.map(({ cell }) => cell);

  return { session, idCell, nameCell, noteCell, destroy };
}

describe('EditSession', () => {
  it('puts an editor in each editable cell and skips the others', () => {
    const { idCell, nameCell, noteCell } = setup();

    expect(idCell?.textContent).toBe('text');
    expect(nameCell?.querySelector('input')?.value).toBe('Amina');
    expect(noteCell?.querySelector('span')).not.toBeNull();
  });

  it('returns the edited row, and keeps fields that are not edited', () => {
    const { session, nameCell } = setup();
    const input = nameCell?.querySelector('input');
    if (input) input.value = 'Salma';

    expect(session.getRow()).toEqual({
      id: 1,
      name: 'Salma',
      note: 'new',
      createdAt: '2024-01-05',
    });
  });

  it('never changes the original data', () => {
    const { session, nameCell } = setup();
    const input = nameCell?.querySelector('input');
    if (input) input.value = 'Salma';

    session.getRow();

    expect(session.originalData).toEqual(row);
    expect(session.originalData).not.toBe(row);
  });

  it('destroys every editor once, even when called twice', () => {
    const { session, nameCell, destroy } = setup();

    session.destroy();
    session.destroy();

    expect(destroy).toHaveBeenCalledOnce();
    expect(nameCell?.childElementCount).toBe(0);
  });
});

describe('EditSession labelProp', () => {
  type Place = { id: number; cityId: number | null; cityName: string | null };

  const cities = [
    { value: 1, label: 'Rabat' },
    { value: 2, label: 'Fès' },
  ];

  function setupPlace(column: Column<Place>) {
    const columns: Column<Place>[] = [column];
    const cells = columns.map((column) => ({ column, cell: document.createElement('td') }));
    const session = new EditSession<Place>({ id: 1, cityId: 1, cityName: 'Rabat' }, cells);
    const select = cells[0]?.cell.querySelector('select') as HTMLSelectElement;

    return { session, select };
  }

  it('saves the picked label in the row', () => {
    const { session, select } = setupPlace({
      title: 'City',
      prop: 'cityId',
      editor: { type: 'select', options: cities, labelProp: 'cityName' },
    });

    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));

    expect(session.getRow()).toEqual({ id: 1, cityId: 2, cityName: 'Fès' });
  });

  it('saves null when nothing is picked', () => {
    const { session, select } = setupPlace({
      title: 'City',
      prop: 'cityId',
      editor: { type: 'select', options: cities, labelProp: 'cityName' },
    });

    select.selectedIndex = -1;
    select.dispatchEvent(new Event('change'));

    expect(session.getRow()).toEqual({ id: 1, cityId: null, cityName: null });
  });

  it('keeps the old label while the options load', () => {
    const { session } = setupPlace({
      title: 'City',
      prop: 'cityId',
      editor: { type: 'select', options: () => new Promise(() => {}), labelProp: 'cityName' },
    });

    expect(session.getRow()).toEqual({ id: 1, cityId: 1, cityName: 'Rabat' });
  });

  it('leaves the row alone without labelProp', () => {
    const { session, select } = setupPlace({
      title: 'City',
      prop: 'cityId',
      editor: { type: 'select', options: cities },
    });

    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));

    expect(session.getRow()).toEqual({ id: 1, cityId: 2, cityName: 'Rabat' });
  });
});
