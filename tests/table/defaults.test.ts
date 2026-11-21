import { describe, expect, it } from 'vitest';

import { type Column, fr, Tadabut, type TadabutOptions } from '../../src/index';
import { mergeOptions } from '../../src/table/defaults';
import { mountPoint } from '../helpers';

type Row = { id: number; name: string };

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
];

const base: TadabutOptions<Row> = {
  data: [
    { id: 1, name: 'Amina' },
    { id: 2, name: 'Karim' },
  ],
  rowId: 'id',
  columns,
  onDelete: () => {},
};

const AppTable = Tadabut.extend({
  texts: fr,
  classNames: { button: 'btn btn-sm', edit: 'btn-outline-primary' },
  icons: { delete: 'fa fa-trash' },
  dataTables: { pageLength: 1, language: { search: 'Chercher :', info: 'Page _PAGE_' } },
});

/** The first button for this action. */
const button = (root: ParentNode, action: string) =>
  root.querySelector<HTMLButtonElement>(`[data-tdb-action="${action}"]`) as HTMLButtonElement;

describe('Tadabut.extend', () => {
  it('builds tables with its defaults', () => {
    const container = mountPoint();
    const table = new AppTable(container, base);

    expect(table).toBeInstanceOf(Tadabut);
    expect(button(container, 'edit').textContent).toBe(fr.edit);
    expect(button(container, 'edit').className).toBe(
      'tdb-button tdb-button-edit btn btn-sm btn-outline-primary',
    );
    expect(button(container, 'delete').querySelector('i')?.className).toBe('fa fa-trash');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.querySelector('.dt-search label')?.textContent).toBe('Chercher :');
  });

  it('lets a page change one key, and keeps the others', () => {
    const container = mountPoint();
    new AppTable(container, {
      ...base,
      texts: { edit: 'Changer' },
      classNames: { edit: 'btn-primary' },
      dataTables: { pageLength: 10, language: { search: 'Filtrer :' } },
    });

    expect(button(container, 'edit').textContent).toBe('Changer');
    expect(button(container, 'delete').textContent).toBe('');
    expect(button(container, 'delete').getAttribute('aria-label')).toBe(fr.delete);
    expect(button(container, 'edit').className).toBe(
      'tdb-button tdb-button-edit btn btn-sm btn-primary',
    );
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelector('.dt-search label')?.textContent).toBe('Filtrer :');
    expect(container.querySelector('.dt-info')?.textContent).toBe('Page 1');
  });

  it('ignores options a page passes as undefined', () => {
    const container = mountPoint();
    new AppTable(container, { ...base, texts: undefined, classNames: undefined });

    expect(button(container, 'edit').textContent).toBe(fr.edit);
    expect(button(container, 'edit').classList.contains('btn')).toBe(true);
  });

  it('builds on another class, and leaves it as it was', () => {
    const ReadOnly = AppTable.extend({ editable: false, texts: { save: 'Valider' } });

    expect(ReadOnly.defaults.texts?.edit).toBe(fr.edit);
    expect(ReadOnly.defaults.texts?.save).toBe('Valider');
    expect(AppTable.defaults.editable).toBeUndefined();
    expect(AppTable.defaults.texts?.save).toBe(fr.save);

    const table = new ReadOnly(mountPoint(), base);

    expect(table.isEditable()).toBe(false);
  });

  it('leaves Tadabut itself alone', () => {
    const container = mountPoint();
    new Tadabut(container, base);

    expect(button(container, 'edit').textContent).toBe('Edit');
    expect(Tadabut.defaults).toEqual({});
  });

  it("can't be changed after extend", () => {
    expect(Object.isFrozen(AppTable.defaults)).toBe(true);
    expect(Object.isFrozen(Tadabut.defaults)).toBe(true);
  });

  it('checks the combined options, so a default can make a page valid', () => {
    const Ticked = Tadabut.extend({ selection: true });

    expect(() => new Ticked(mountPoint(), { ...base, totalRows: 'selected' })).not.toThrow();
  });

  it('lets a page replace selection and confirmDelete', async () => {
    const NoAsk = Tadabut.extend({ confirmDelete: false, selection: true });
    const container = mountPoint();
    let asked = false;
    new NoAsk(container, {
      ...base,
      selection: false,
      confirmDelete: () => {
        asked = true;
        return false;
      },
    });

    button(container, 'delete').click();
    await Promise.resolve();

    expect(container.querySelector('.tdb-select')).toBeNull();
    expect(asked).toBe(true);
  });
});

describe('mergeOptions', () => {
  it('lets a language object replace a url, and the other way around', () => {
    expect(
      mergeOptions(
        { dataTables: { language: { url: 'fr.json' } } },
        { dataTables: { language: { search: 'S' } } },
      ).dataTables?.language,
    ).toEqual({ url: 'fr.json', search: 'S' });

    expect(
      mergeOptions({ dataTables: { language: { search: 'S' } } }, { dataTables: { paging: false } })
        .dataTables,
    ).toEqual({ language: { search: 'S' }, paging: false });
  });

  it('never changes the objects it was given', () => {
    const defaults = { texts: { save: 'A' } };
    const page = { texts: { cancel: 'B' } };

    mergeOptions(defaults, page);

    expect(defaults).toEqual({ texts: { save: 'A' } });
    expect(page).toEqual({ texts: { cancel: 'B' } });
  });
});
