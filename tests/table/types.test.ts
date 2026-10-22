import { describe, expect, it } from 'vitest';

import type { Column, TadabutOptions } from '../../src/index';

type Row = { id: number; name: string };

describe('types', () => {
  it('rejects a column prop that is not a row key', () => {
    const column: Column<Row> = {
      title: 'Name',
      // @ts-expect-error 'nmae' is not a key of Row
      prop: 'nmae',
    };

    expect(column.prop).toBe('nmae');
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
});
