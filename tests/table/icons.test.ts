import { describe, expect, it } from 'vitest';

import { type Column, fr, Tadabut, type TadabutOptions } from '../../src/index';
import { mountPoint, settle } from '../helpers';

type Row = { id: number; name: string };

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text' } },
];

const icons = {
  edit: 'fa fa-pencil',
  delete: 'fa fa-trash',
  save: 'fa fa-check',
  cancel: 'fa fa-times',
  confirm: 'fa fa-check-circle',
  keep: 'fa fa-undo',
  showDetail: 'fa fa-plus',
  hideDetail: 'fa fa-minus',
};

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = mountPoint();
  const table = new Tadabut(container, {
    data: [
      { id: 1, name: 'Amina' },
      { id: 2, name: 'Karim' },
    ],
    rowId: 'id',
    columns,
    onSave: (row) => row,
    onAdd: (row) => ({ ...row, id: 99 }) as Row,
    onDelete: () => {},
    icons,
    dataTables: { order: [] },
    ...options,
  });

  /** The first button for this action in the table. */
  const button = (action: string) =>
    container.querySelector<HTMLButtonElement>(
      `[data-tdb-action="${action}"]`,
    ) as HTMLButtonElement;

  return { container, table, button };
}

/** What a button shows and says: its icon's classes, its text, and its labels. */
function looks(button: HTMLButtonElement) {
  return {
    icon: button.querySelector('i')?.className,
    hidden: button.querySelector('i')?.getAttribute('aria-hidden'),
    text: button.textContent,
    label: button.getAttribute('aria-label'),
    title: button.getAttribute('title'),
  };
}

describe('icons on the buttons', () => {
  it('shows Edit and Delete as icons, with their text as label and tooltip', () => {
    const { button } = setup();

    expect(looks(button('edit'))).toEqual({
      icon: 'fa fa-pencil',
      hidden: 'true',
      text: '',
      label: 'Edit',
      title: 'Edit',
    });
    expect(looks(button('delete')).icon).toBe('fa fa-trash');
  });

  it('uses the translated text for the labels', () => {
    const { button } = setup({ texts: fr });

    expect(button('edit').getAttribute('aria-label')).toBe(fr.edit);
  });

  it('shows Save and Cancel as icons, in an open row and in the new row', () => {
    const { container, table, button } = setup();

    table.edit(1);

    expect(looks(button('save'))).toMatchObject({ icon: 'fa fa-check', label: 'Save' });
    expect(looks(button('cancel'))).toMatchObject({ icon: 'fa fa-times', label: 'Cancel' });

    table.cancel(1);
    table.add();

    const newSave = container.querySelector<HTMLButtonElement>(
      '.tdb-row-new [data-tdb-action="save"]',
    );

    expect(newSave?.querySelector('i')?.className).toBe('fa fa-check');
  });

  it('shows the delete question with icons', () => {
    const { button } = setup();

    button('delete').click();

    expect(looks(button('confirm'))).toMatchObject({
      icon: 'fa fa-check-circle',
      label: 'Yes, delete',
    });
    expect(looks(button('keep'))).toMatchObject({ icon: 'fa fa-undo', label: 'No' });
  });

  it('keeps the text on buttons without an icon', () => {
    const { table, button } = setup({ icons: { edit: 'fa fa-pencil' } });

    expect(looks(button('delete'))).toEqual({
      icon: undefined,
      hidden: undefined,
      text: 'Delete',
      label: null,
      title: null,
    });

    table.edit(1);

    expect(button('save').textContent).toBe('Save');
  });

  it("doesn't put the button's classes on the icon, or the icon's on the button", () => {
    const { table, button } = setup({ classNames: { button: 'btn', save: 'btn-primary' } });

    table.edit(1);

    expect(button('save').className).toBe('tdb-button tdb-button-save btn btn-primary');
    expect(button('save').querySelector('i')?.className).toBe('fa fa-check');
  });

  it('still clicks through the icon', async () => {
    const { container, table } = setup();

    container.querySelector<HTMLElement>('[data-tdb-action="edit"] i')?.click();

    expect(table.isEditing(1)).toBe(true);

    container.querySelector<HTMLElement>('[data-tdb-action="cancel"] i')?.click();
    await settle();

    expect(table.isEditing(1)).toBe(false);
  });

  it('never turns the classes into HTML', () => {
    const { container, button } = setup({ icons: { edit: 'x"><img src=y onerror=alert(1)>' } });

    expect(container.querySelector('img')).toBeNull();
    expect(button('edit').querySelector('i')?.getAttribute('class')).toBe(
      'x"><img src=y onerror=alert(1)>',
    );
  });
});

describe('icons on the detail button', () => {
  it('swaps the icon when the detail opens and closes', async () => {
    const { button, table } = setup({ detail: () => 'More' });

    expect(looks(button('detail'))).toMatchObject({
      icon: 'fa fa-plus',
      label: 'Show details',
      title: 'Show details',
    });
    expect(button('detail').getAttribute('aria-expanded')).toBe('false');

    table.openDetail(1);
    await settle();

    expect(looks(button('detail'))).toMatchObject({
      icon: 'fa fa-minus',
      label: 'Hide details',
      title: 'Hide details',
    });
    expect(button('detail').getAttribute('aria-expanded')).toBe('true');

    table.closeDetail(1);
    await settle();

    expect(looks(button('detail')).icon).toBe('fa fa-plus');
  });

  it('keeps the arrow for a state without an icon, with its label', async () => {
    const { button, table } = setup({ detail: () => 'More', icons: { showDetail: 'fa fa-plus' } });

    table.openDetail(1);
    await settle();

    expect(looks(button('detail'))).toEqual({
      icon: undefined,
      hidden: undefined,
      text: '▾',
      label: 'Hide details',
      title: null,
    });
  });

  it('keeps the arrows without icons, like before', async () => {
    const { button, table } = setup({ detail: () => 'More', icons: undefined });

    expect(button('detail').textContent).toBe('▸');

    table.openDetail(1);
    await settle();

    expect(looks(button('detail'))).toMatchObject({
      text: '▾',
      label: 'Hide details',
      title: null,
    });
  });
});
