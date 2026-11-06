import { describe, expect, it } from 'vitest';

import {
  type Column,
  type EditorInstance,
  fr,
  type Tadabut,
  type TadabutOptions,
} from '../../src/index';

type Row = {
  id: number;
  name: string;
  nickname?: string;
  hiredAt: string;
  active: boolean;
  status: 'draft' | 'published';
  managerId: number | null;
  location: { lat: number; lng: number };
};

declare const locationEditor: EditorInstance<{ lat: number; lng: number }>;
declare const managerEditor: EditorInstance<number | null>;
declare const textEditor: EditorInstance<string>;

describe('column types', () => {
  it('rejects a prop that is not a row key', () => {
    const column: Column<Row> = {
      title: 'Name',
      // @ts-expect-error 'nmae' is not a key of Row
      prop: 'nmae',
    };

    expect(column.title).toBe('Name');
  });

  it('rejects a rowId that is not a row key', () => {
    const options: TadabutOptions<Row> = {
      data: [],
      columns: [],
      // @ts-expect-error 'idd' is not a key of Row
      rowId: 'idd',
    };

    expect(options.rowId).toBe('idd');
  });

  it('accepts the editing modes, and nothing else', () => {
    const options: TadabutOptions<Row> = {
      data: [],
      columns: [],
      editing: { mode: 'multiple', button: false },
    };
    const wrong: TadabutOptions<Row> = {
      data: [],
      columns: [],
      // @ts-expect-error 'many' is not an editing mode
      editing: { mode: 'many' },
    };

    expect(options.editing?.mode).toBe('multiple');
    expect(wrong.editing?.mode).toBe('many');
  });

  it('accepts columns without an editor', () => {
    const column: Column<Row> = { title: 'ID', prop: 'id' };

    expect(column.prop).toBe('id');
  });

  it('accepts editors that fit the column type', () => {
    const columns: Column<Row>[] = [
      { title: 'ID', prop: 'id', editor: { type: 'number', min: 1 } },
      { title: 'Name', prop: 'name', editor: { type: 'text', maxLength: 50 } },
      { title: 'Nickname', prop: 'nickname', editor: { type: 'text' } },
      { title: 'Hired', prop: 'hiredAt', editor: { type: 'date' } },
      { title: 'Active', prop: 'active', editor: { type: 'checkbox' } },
      {
        title: 'Manager',
        prop: 'managerId',
        editor: { type: 'select', options: [{ value: 7, label: 'Omar' }] },
      },
      {
        title: 'Status',
        prop: 'status',
        editor: {
          type: 'select',
          options: [{ value: 'draft', label: 'Draft' }],
        },
      },
    ];

    expect(columns).toHaveLength(7);
  });

  it('rejects editors that do not fit the column type', () => {
    const columns: Column<Row>[] = [
      // @ts-expect-error a text editor on a number column
      { title: 'ID', prop: 'id', editor: { type: 'text' } },
      // @ts-expect-error a number editor on a string column
      { title: 'Name', prop: 'name', editor: { type: 'number' } },
      // @ts-expect-error a checkbox on a string column
      { title: 'Name', prop: 'name', editor: { type: 'checkbox' } },
    ];

    expect(columns).toHaveLength(3);
  });

  it('rejects options that do not fit the editor', () => {
    const columns: Column<Row>[] = [
      // @ts-expect-error min is not a text editor option
      { title: 'Name', prop: 'name', editor: { type: 'text', min: 1 } },
      // @ts-expect-error string values on a number column
      {
        title: 'Manager',
        prop: 'managerId',
        editor: {
          type: 'select',
          options: [{ value: '7', label: 'Omar' }],
        },
      },
      // @ts-expect-error 'archived' is not a status
      {
        title: 'Status',
        prop: 'status',
        editor: {
          type: 'select',
          options: [{ value: 'archived', label: 'Archived' }],
        },
      },
    ];

    expect(columns).toHaveLength(3);
  });

  it('checks className', () => {
    const columns: Column<Row>[] = [
      {
        title: 'Name',
        prop: 'name',
        editor: { type: 'text', className: 'border' },
      },
      // @ts-expect-error className must be a string
      { title: 'Name', prop: 'name', editor: { type: 'text', className: 5 } },
    ];

    expect(columns).toHaveLength(2);
  });

  it('accepts a custom editor on any column, even an object column', () => {
    const columns: Column<Row>[] = [
      {
        title: 'Location',
        prop: 'location',
        editor: { type: 'custom', create: () => locationEditor },
      },
      {
        title: 'Manager',
        prop: 'managerId',
        editor: { type: 'custom', create: () => managerEditor },
      },
    ];

    expect(columns).toHaveLength(2);
  });

  it('still rejects built-in editors on an object column', () => {
    const columns: Column<Row>[] = [
      // @ts-expect-error no built-in editor fits an object
      { title: 'Location', prop: 'location', editor: { type: 'text' } },
    ];

    expect(columns).toHaveLength(1);
  });

  it('rejects a custom editor that returns the wrong value type', () => {
    const columns: Column<Row>[] = [
      // @ts-expect-error a string editor on a number column
      {
        title: 'ID',
        prop: 'id',
        editor: { type: 'custom', create: () => textEditor },
      },
    ];

    expect(columns).toHaveLength(1);
  });

  it('gives a custom editor the full column type, null included', () => {
    const column: Column<Row> = {
      title: 'Manager',
      prop: 'managerId',
      editor: {
        type: 'custom',
        create: (context) => {
          const value: number | null = context.value;
          // @ts-expect-error the value can be null
          const notNull: number = context.value;
          expect([value, notNull]).toBeDefined();
          return managerEditor;
        },
      },
    };

    expect(column.prop).toBe('managerId');
  });

  it('accepts required and validate on every editor', () => {
    const columns: Column<Row>[] = [
      { title: 'Name', prop: 'name', editor: { type: 'text', required: true } },
      { title: 'ID', prop: 'id', editor: { type: 'number', required: true } },
      { title: 'Hired', prop: 'hiredAt', editor: { type: 'date', required: true } },
      {
        title: 'Active',
        prop: 'active',
        editor: { type: 'checkbox', validate: () => undefined },
      },
      {
        title: 'Status',
        prop: 'status',
        editor: { type: 'select', options: [], required: true },
      },
      {
        title: 'Manager',
        prop: 'managerId',
        editor: {
          type: 'custom',
          create: () => managerEditor,
          required: true,
          validate: (value) => (value === null ? 'Pick one' : undefined),
        },
      },
    ];

    expect(columns).toHaveLength(6);
  });

  it('types the value and the row inside validate', () => {
    const column: Column<Row> = {
      title: 'ID',
      prop: 'id',
      editor: {
        type: 'number',
        validate: (value, row) => {
          const id: number | null = value;
          const active: boolean = row.active;
          // @ts-expect-error the value can be null
          const notNull: number = value;
          // @ts-expect-error Row has no field 'nope'
          const missing = row.nope;
          expect([id, active, notNull, missing]).toBeDefined();
          return undefined;
        },
      },
    };

    expect(column.prop).toBe('id');
  });

  it('rejects a validate that does not return a message', () => {
    const column: Column<Row> = {
      title: 'ID',
      prop: 'id',
      editor: {
        type: 'number',
        // @ts-expect-error validate must return a string or undefined
        validate: () => 5,
      },
    };

    expect(column.prop).toBe('id');
  });
});

describe('select options types', () => {
  type Place = { id: number; countryId: number; cityId: number | null; zone: string };

  it('accepts a function with dependsOn, and types its row', async () => {
    const column: Column<Place> = {
      title: 'City',
      prop: 'cityId',
      editor: {
        type: 'select',
        dependsOn: 'countryId',
        options: async (row, { signal }) => {
          const countryId: number = row.countryId;
          return signal.aborted ? [] : [{ value: countryId * 10, label: 'Rabat' }];
        },
      },
    };

    expect(column.editor?.type).toBe('select');
  });

  it('accepts a function that returns the list right away', () => {
    const column: Column<Place> = {
      title: 'Zone',
      prop: 'zone',
      editor: {
        type: 'select',
        dependsOn: 'countryId',
        options: (row) => [{ value: `zone-${row.countryId}`, label: 'Zone' }],
      },
    };

    expect(column.prop).toBe('zone');
  });

  it('rejects dependsOn on a field the row does not have', () => {
    const column: Column<Place> = {
      title: 'City',
      prop: 'cityId',
      // @ts-expect-error 'nope' is not a key of Place
      editor: { type: 'select', dependsOn: 'nope', options: () => [] },
    };

    expect(column.prop).toBe('cityId');
  });

  it('rejects dependsOn with a fixed list', () => {
    const column: Column<Place> = {
      title: 'City',
      prop: 'cityId',
      // @ts-expect-error dependsOn needs options to be a function
      editor: { type: 'select', dependsOn: 'countryId', options: [] },
    };

    expect(column.prop).toBe('cityId');
  });

  it('rejects a function that returns the wrong value type', () => {
    // @ts-expect-error 'x' is not a number
    const column: Column<Place> = {
      title: 'City',
      prop: 'cityId',
      editor: { type: 'select', options: () => [{ value: 'x', label: 'X' }] },
    };

    expect(column.prop).toBe('cityId');
  });

  it('rejects an async function that returns the wrong value type', () => {
    // These errors land on the column, not the editor.
    // @ts-expect-error 'x' is not a number
    const column: Column<Place> = {
      title: 'City',
      prop: 'cityId',
      editor: { type: 'select', options: async () => [{ value: 'x', label: 'X' }] },
    };

    expect(column.prop).toBe('cityId');
  });
});

describe('render types', () => {
  type Pay = { id: number; salary: number; label: string };

  it('gives render the column value type and the row', () => {
    const column: Column<Pay> = {
      title: 'Salary',
      prop: 'salary',
      render: (value, row) => `${value.toFixed(2)} ${row.label}`,
    };

    expect(column.prop).toBe('salary');
  });

  it('rejects a render that returns something other than text', () => {
    // @ts-expect-error render must return a string
    const column: Column<Pay> = { title: 'Salary', prop: 'salary', render: (value) => value };

    expect(column.prop).toBe('salary');
  });
});

describe('classNames types', () => {
  it('accepts the known keys, and nothing else', () => {
    const options: TadabutOptions<Row> = {
      data: [],
      columns: [],
      classNames: { table: 'table', button: 'btn', edit: 'a', save: 'b', cancel: 'c' },
    };
    const wrong: TadabutOptions<Row> = {
      data: [],
      columns: [],
      // @ts-expect-error 'tabel' is not a classNames key
      classNames: { tabel: 'table' },
    };

    expect(options.classNames?.table).toBe('table');
    expect(wrong.classNames).toBeDefined();
  });
});

describe('DataTables settings and column options types', () => {
  it('accepts DataTables settings', () => {
    const options: TadabutOptions<Row> = {
      data: [],
      columns: [],
      dataTables: { order: [[0, 'asc']], pageLength: 20, paging: true },
    };

    expect(options.dataTables?.pageLength).toBe(20);
  });

  it('rejects the settings Tadabut controls', () => {
    const withData: TadabutOptions<Row> = {
      data: [],
      columns: [],
      // @ts-expect-error data is set by Tadabut
      dataTables: { data: [] },
    };
    const withColumns: TadabutOptions<Row> = {
      data: [],
      columns: [],
      // @ts-expect-error columns are set by Tadabut
      dataTables: { columns: [] },
    };
    const withAjax: TadabutOptions<Row> = {
      data: [],
      columns: [],
      // @ts-expect-error Tadabut doesn't let DataTables load rows by itself
      dataTables: { ajax: '/rows' },
    };

    expect([withData, withColumns, withAjax]).toHaveLength(3);
  });

  it('accepts the column options', () => {
    const column: Column<Row> = {
      title: 'ID',
      prop: 'id',
      width: '60px',
      visible: false,
      orderable: false,
      searchable: false,
      className: 'text-end',
    };

    expect(column.width).toBe('60px');
  });

  it('rejects column options of the wrong type', () => {
    // @ts-expect-error visible is a boolean
    const column: Column<Row> = { title: 'ID', prop: 'id', visible: 'no' };

    expect(column.prop).toBe('id');
  });
});

describe('labelProp types', () => {
  type City = { id: number; cityId: number | null; cityName: string; note?: string; age: number };
  const cities = [{ value: 1, label: 'Rabat' }];

  it('accepts a text field, with a fixed list and with a function', () => {
    const fixed: Column<City> = {
      title: 'City',
      prop: 'cityId',
      editor: { type: 'select', options: cities, labelProp: 'cityName' },
    };
    const loaded: Column<City> = {
      title: 'City',
      prop: 'cityId',
      editor: { type: 'select', options: () => cities, labelProp: 'note' },
    };

    expect([fixed, loaded]).toHaveLength(2);
  });

  it('rejects a field that does not hold text', () => {
    const column: Column<City> = {
      title: 'City',
      prop: 'cityId',
      // @ts-expect-error age is a number
      editor: { type: 'select', options: cities, labelProp: 'age' },
    };

    expect(column.prop).toBe('cityId');
  });

  it('rejects a field the row does not have', () => {
    const column: Column<City> = {
      title: 'City',
      prop: 'cityId',
      // @ts-expect-error nope is not a key of City
      editor: { type: 'select', options: cities, labelProp: 'nope' },
    };

    expect(column.prop).toBe('cityId');
  });

  it('rejects labelProp on editors that are not selects', () => {
    const column: Column<City> = {
      title: 'Name',
      prop: 'cityName',
      // @ts-expect-error only selects have labelProp
      editor: { type: 'text', labelProp: 'cityName' },
    };

    expect(column.prop).toBe('cityName');
  });
});

describe('checkbox values types', () => {
  type Flags = { id: number; active: 'O' | 'N' | null; code: string; level: number; done: boolean };

  it('allows values on string and number columns', () => {
    const columns: Column<Flags>[] = [
      {
        title: 'A',
        prop: 'active',
        editor: { type: 'checkbox', values: { checked: 'O', unchecked: 'N' } },
      },
      {
        title: 'C',
        prop: 'code',
        editor: { type: 'checkbox', values: { checked: 'Y', unchecked: 'N' } },
      },
      {
        title: 'L',
        prop: 'level',
        editor: { type: 'checkbox', values: { checked: 1, unchecked: 0 } },
      },
      { title: 'D', prop: 'done', editor: { type: 'checkbox' } },
    ];

    expect(columns).toHaveLength(4);
  });

  it('allows values when the rows are any', () => {
    // biome-ignore lint/suspicious/noExplicitAny: rows coming from plain JavaScript
    const columns: Column<any>[] = [
      {
        title: 'A',
        prop: 'active',
        editor: { type: 'checkbox', values: { checked: 'O', unchecked: 'N' } },
      },
    ];

    expect(columns).toHaveLength(1);
  });

  it('checks the values against the column', () => {
    // Kept short so the line never wraps: the boolean error lands on `values`.
    const yesNo = { checked: true, unchecked: false };
    const columns: Column<Flags>[] = [
      // @ts-expect-error 'Y' is not 'O' | 'N'
      {
        title: 'A',
        prop: 'active',
        editor: { type: 'checkbox', values: { checked: 'Y', unchecked: 'N' } },
      },
      // @ts-expect-error a string column needs values
      { title: 'C', prop: 'code', editor: { type: 'checkbox' } },
      // @ts-expect-error a number column needs numbers
      {
        title: 'L',
        prop: 'level',
        editor: { type: 'checkbox', values: { checked: '1', unchecked: '0' } },
      },
      // @ts-expect-error a boolean column has no values
      { title: 'D', prop: 'done', editor: { type: 'checkbox', values: yesNo } },
    ];

    expect(columns).toHaveLength(4);
  });
});

describe('money types', () => {
  type Pay = { id: number; salary: number | null; label: string };

  it('accepts money on a number column, with its options', () => {
    const column: Column<Pay> = {
      title: 'Salary',
      prop: 'salary',
      editor: { type: 'money', min: 0, decimals: 0, separator: '.', point: ',' },
    };

    expect(column.prop).toBe('salary');
  });

  it('rejects money on a string column, and unknown options', () => {
    const columns: Column<Pay>[] = [
      // @ts-expect-error money is for numbers
      { title: 'Label', prop: 'label', editor: { type: 'money' } },
      // @ts-expect-error step is a number editor option
      { title: 'Salary', prop: 'salary', editor: { type: 'money', step: 1 } },
    ];

    expect(columns).toHaveLength(2);
  });
});

describe('add types', () => {
  type Person = { id: number; name: string };

  it('gives onAdd a partial row, so the id has to be checked', () => {
    const options: TadabutOptions<Person> = {
      data: [],
      columns: [],
      rowId: 'id',
      onAdd: (row) => {
        // @ts-expect-error the id doesn't exist yet
        row.id.toFixed();

        return { id: 1, name: row.name ?? '' };
      },
    };

    expect(options).toBeDefined();
  });

  it('lets onAdd return a full row, nothing, or a promise of either', () => {
    const nothing: TadabutOptions<Person> = { data: [], columns: [], onAdd: () => {} };
    const later: TadabutOptions<Person> = {
      data: [],
      columns: [],
      onAdd: async () => ({ id: 1, name: 'Amina' }),
    };
    const partial: TadabutOptions<Person> = {
      data: [],
      columns: [],
      // @ts-expect-error the saved row must be a full row
      onAdd: () => ({ name: 'Amina' }),
    };

    expect([nothing, later, partial]).toHaveLength(3);
  });

  it('checks the defaults given to add()', () => {
    const table = {} as Tadabut<Person>;
    const check = () => {
      table.add({ name: 'Amina' });
      // @ts-expect-error not a field of the row
      table.add({ nam: 'Amina' });
      // @ts-expect-error wrong type
      table.add({ id: 'one' });
    };

    expect(check).toBeDefined();
  });
});

describe('delete types', () => {
  it('gives onDelete and confirmDelete the row type', () => {
    const options: TadabutOptions<Row> = {
      data: [],
      columns: [],
      rowId: 'id',
      onDelete: async (row) => {
        row.name.toUpperCase();
      },
      confirmDelete: (row) => window.confirm(row.name),
    };

    expect(options).toBeDefined();
  });

  it('accepts false or an async confirmDelete, but not true', () => {
    const never: TadabutOptions<Row> = { data: [], columns: [], confirmDelete: false };
    const modal: TadabutOptions<Row> = {
      data: [],
      columns: [],
      confirmDelete: async () => true,
    };
    const always: TadabutOptions<Row> = {
      data: [],
      columns: [],
      // @ts-expect-error leave confirmDelete out to ask inline
      confirmDelete: true,
    };

    expect([never, modal, always]).toHaveLength(3);
  });
});

describe('texts types', () => {
  it('accepts a language, or a part of one', () => {
    const whole: TadabutOptions<Row> = { data: [], columns: [], texts: fr };
    const part: TadabutOptions<Row> = { data: [], columns: [], texts: { save: 'Valider' } };

    expect([whole, part]).toHaveLength(2);
  });

  it('rejects unknown keys and wrong types', () => {
    const typo: TadabutOptions<Row> = {
      data: [],
      columns: [],
      // @ts-expect-error 'sve' is not a text
      texts: { sve: 'x' },
    };
    const notAFunction: TadabutOptions<Row> = {
      data: [],
      columns: [],
      // @ts-expect-error tooSmall takes the number and returns the message
      texts: { tooSmall: 'x' },
    };

    expect([typo, notAFunction]).toHaveLength(2);
  });
});
