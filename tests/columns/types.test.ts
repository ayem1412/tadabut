import { describe, expect, it } from 'vitest';

import type { Column, TadabutOptions } from '../../src/index';

type Row = {
  id: number;
  name: string;
  nickname?: string;
  hiredAt: string;
  active: boolean;
  status: 'draft' | 'published';
  managerId: number | null;
};

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
});
