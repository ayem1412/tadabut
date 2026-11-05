import { afterEach, describe, expect, it } from 'vitest';

import { type Column, en, fr, Tadabut, type TadabutOptions } from '../../src/index';

type Row = { id: number; name: string; age: number; cityId: number | null };

const columns: Column<Row>[] = [
  { title: 'ID', prop: 'id' },
  { title: 'Name', prop: 'name', editor: { type: 'text', required: true } },
  { title: 'Age', prop: 'age', editor: { type: 'number', min: 18 } },
];

function setup(options: Partial<TadabutOptions<Row>> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const table = new Tadabut<Row>(container, {
    data: [{ id: 1, name: 'Amina', age: 29, cityId: null }],
    rowId: 'id',
    columns,
    ...options,
  });

  const button = (action: string) =>
    container.querySelector(`[data-tdb-action="${action}"]`)?.textContent;
  const errors = () => [...container.querySelectorAll('.tdb-error')].map((e) => e.textContent);
  const inputs = () => [...container.querySelectorAll<HTMLInputElement>('tbody input')];

  return { container, table, button, errors, inputs };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('texts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses English by default', () => {
    const { table, button } = setup();
    expect(button('edit')).toBe('Edit');

    table.edit(1);

    expect(button('save')).toBe('Save');
    expect(button('cancel')).toBe('Cancel');
  });

  it('uses the French buttons with texts: fr', () => {
    const { table, button } = setup({ texts: fr });
    expect(button('edit')).toBe('Modifier');

    table.edit(1);

    expect(button('save')).toBe('Enregistrer');
    expect(button('cancel')).toBe('Annuler');
  });

  it('shows validation errors in French', async () => {
    const { table, errors, inputs } = setup({ texts: fr });
    table.edit(1);
    const [name, age] = inputs() as [HTMLInputElement, HTMLInputElement];
    name.value = '';
    age.value = '12';

    expect(await table.save(1)).toBe(false);

    expect(errors()).toEqual(['Ce champ est obligatoire.', 'Doit être supérieur ou égal à 18.']);
  });

  it('keeps English for what is left out', () => {
    const { table, button } = setup({ texts: { save: 'Valider' } });
    expect(button('edit')).toBe('Edit');

    table.edit(1);

    expect(button('save')).toBe('Valider');
    expect(button('cancel')).toBe('Cancel');
  });

  it('shows the Edit label as text, not HTML', () => {
    const { container } = setup({ texts: { edit: '<b>Go</b>' } });

    expect(container.querySelector('[data-tdb-action="edit"]')?.textContent).toBe('<b>Go</b>');
    expect(container.querySelector('tbody b')).toBeNull();
  });

  it('uses saveFailed when onSave throws something that is not an Error', async () => {
    const { table, container } = setup({
      texts: fr,
      onSave: () => {
        throw 'nope';
      },
    });
    table.edit(1);

    await table.save(1);

    expect(container.querySelector('.tdb-row-error-message')?.textContent).toBe(
      "Impossible d'enregistrer.",
    );
  });

  it('uses the loading and load failed texts in selects', async () => {
    let reject!: (error: unknown) => void;
    const { table, container, errors } = setup({
      texts: fr,
      columns: [
        { title: 'ID', prop: 'id' },
        {
          title: 'City',
          prop: 'cityId',
          editor: {
            type: 'select',
            options: () => new Promise((_resolve, rej) => (reject = rej)),
          },
        },
      ],
    });
    table.edit(1);

    expect(container.querySelector('tbody select option')?.textContent).toBe('Chargement…');

    reject(new Error('down'));
    await flush();

    expect(errors()).toEqual(['Impossible de charger les options.']);
  });
});

describe('built-in languages', () => {
  it('have the same keys', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });

  it('put the number or date in the messages that need one', () => {
    for (const texts of [en, fr]) {
      expect(texts.tooShort(3)).toContain('3');
      expect(texts.tooLong(9)).toContain('9');
      expect(texts.tooSmall(18)).toContain('18');
      expect(texts.tooLarge(99)).toContain('99');
      expect(texts.tooEarly('2020-01-01')).toContain('2020-01-01');
      expect(texts.tooLate('2030-12-31')).toContain('2030-12-31');
    }
  });
});
