import { describe, expect, it } from 'vitest';

import type { Column, EditorInstance, TadabutOptions } from '../../src/index';

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
});
