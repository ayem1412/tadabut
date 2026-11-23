import { type Column, fr, Tadabut } from '../../../src/index';
import { type Demo, type Employee, employees, fakeServer, small } from './shared';

/** styling.md: Tadabut's own texts in French. */
const demo: Demo = (box) => {
  const columns: Column<Employee>[] = [
    { title: 'Nom', prop: 'name', editor: { type: 'text', required: true } },
    { title: 'Âge', prop: 'age', editor: { type: 'number', min: 18 } },
  ];

  new Tadabut<Employee>(box.table, {
    data: employees(),
    rowId: 'id',
    columns,
    dataTables: small,
    texts: fr,
    ...fakeServer(box),
  });

  box.hint(
    'Click Modifier, clear the name and save: the error is in French too. Delete asks in French.',
  );
};

export default demo;
