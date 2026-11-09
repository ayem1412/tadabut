import { moneyFormat } from '../editors/money';
import type { TadabutOptions } from './options';

/**
 * Throws on options that can't work together, before anything is built.
 *
 * @throws If a column has an `editor` and there's no `rowId`.
 * @throws If `onDelete` is set and there's no `rowId`.
 * @throws If `selection` is on and there's no `rowId`.
 * @throws If a hidden column (`visible: false`) has an `editor`.
 * @throws If a select's `labelProp` is its own column.
 * @throws If a money editor's `separator` and `point` are the same.
 */
export function checkOptions<Row extends object>(options: TadabutOptions<Row>): void {
  if (options.rowId === undefined) {
    if (options.columns.some((column) => column.editor !== undefined)) {
      throw new Error('Tadabut: rowId is required when a column has an editor.');
    }

    if (options.onDelete !== undefined) {
      throw new Error('Tadabut: rowId is required with onDelete.');
    }

    if (options.selection) {
      throw new Error('Tadabut: rowId is required with selection.');
    }
  }

  // Not `!column.visible`: undefined means visible.
  const hiddenEditable = options.columns.find(
    (column) => column.editor !== undefined && column.visible === false,
  );

  if (hiddenEditable !== undefined) {
    throw new Error(
      `Tadabut: the "${hiddenEditable.prop}" column can't have both an editor and visible: false.`,
    );
  }

  const selfLabeled = options.columns.find(
    (column) => column.editor?.type === 'select' && column.editor.labelProp === column.prop,
  );

  if (selfLabeled !== undefined) {
    throw new Error(
      `Tadabut: the "${selfLabeled.prop}" column's labelProp can't be "${selfLabeled.prop}" itself.`,
    );
  }

  for (const column of options.columns) {
    if (column.editor?.type !== 'money') {
      continue;
    }

    // With the defaults filled in, so `point: ' '` alone is caught too.
    const { separator, point } = moneyFormat(column.editor);

    if (separator === point) {
      throw new Error(
        `Tadabut: the "${column.prop}" column's money separator and point can't both be "${point}".`,
      );
    }
  }
}
