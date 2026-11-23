---
title: 'React'
description: 'The <Tadabut> component from tadabut/react.'
---

The `<Tadabut>` component from `tadabut/react`.

The examples use the `Employee` type from the [quick start](getting-started.mdx#quick-start).

Same options, as props. Keep `columns` outside your component, or in a `useMemo`, so it doesn't change on every render.

A whole file you can copy:

```tsx
import 'datatables.net-dt';
import 'datatables.net-dt/css';

import { useRef, useState } from 'react';
import type { Column } from 'tadabut';
import { Tadabut, type TadabutHandle } from 'tadabut/react';

type Employee = { id: number; name: string; countryId: number | null };

const columns: Column<Employee>[] = [
  { prop: 'id', title: 'ID' },
  { prop: 'name', title: 'Name', editor: { type: 'text', required: true } },
  {
    prop: 'countryId',
    title: 'Country',
    editor: {
      type: 'select',
      options: [
        { value: 1, label: 'Morocco' },
        { value: 2, label: 'France' },
      ],
    },
  },
];

async function saveEmployee(row: Employee): Promise<void> {
  const res = await fetch(`/api/employees/${row.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });

  if (!res.ok) throw new Error('Could not save the employee');
}

async function createEmployee(row: Partial<Employee>): Promise<Employee> {
  const res = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });

  if (!res.ok) throw new Error('Could not add the employee');

  return res.json();
}

async function deleteEmployee(row: Employee): Promise<void> {
  const res = await fetch(`/api/employees/${row.id}`, { method: 'DELETE' });

  if (!res.ok) throw new Error('Could not delete the employee');
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([
    { id: 1, name: 'Amina', countryId: 1 },
    { id: 2, name: 'Paul', countryId: 2 },
  ]);
  const tableRef = useRef<TadabutHandle<Employee>>(null);

  return (
    <>
      <button type="button" onClick={() => tableRef.current?.edit(1)}>
        Edit Amina
      </button>
      <button type="button" onClick={() => tableRef.current?.add()}>
        Add an employee
      </button>

      <Tadabut
        ref={tableRef}
        data={employees}
        rowId="id"
        columns={columns}
        editing={{ mode: 'multiple' }}
        onSave={(row) => saveEmployee(row)}
        onAdd={async (row) => {
          const saved = await createEmployee(row);
          setEmployees((current) => [...current, saved]);
          return saved;
        }}
        onDelete={async (row) => {
          await deleteEmployee(row);
          setEmployees((current) => current.filter((e) => e.id !== row.id));
        }}
      />
    </>
  );
}
```

- When `employees` changes, the table updates in place. It doesn't get rebuilt.
- `onSave`, `onAdd`, `onDelete`, `confirmDelete`, `onSelect`, `onCurrentChange` and the [events](events.md) can be new functions on every render. The table always calls the latest ones.
- In `onAdd` and `onDelete`, update your state too, like above. Otherwise the next time `data` changes, the new row disappears, or the deleted one comes back.
- `totalRows` is a plain string, so writing it inline is fine. Changing it rebuilds the table, to count other rows.
- `selection={{ checkAll: 'page' }}` inline is fine too: only turning it on or off, or changing `checkAll`, rebuilds the table. A rebuild clears the selection.
- Turning `currentRow` on or off rebuilds the table, and clears the highlight.
- `detail` can return JSX, async or not: `detail={(row) => <OrderLines orderId={row.id} />}`. React draws it under the row, so your components, hooks and state work inside it, and it's cleaned up when the detail closes. It can be a new function on every render: only turning it on or off rebuilds the table. This needs `react-dom`, which every React app already has.
- `editing` can be a new object on every render too. The table is only rebuilt when `mode`, `button` or `doubleClick` really change. Changing `columns`, `rowId` or `editing` closes any row being edited.
- The ref has the same methods as the core: `edit`, `save`, `cancel`, `delete`, `isEditing`, `add`, `saveNew`, `cancelNew`, `isAdding`, `getSelected`, `isSelected`, `select`, `deselect`, `clearSelection`, `setCurrent`, `getCurrent`, `isCurrent`, `openDetail`, `closeDetail`, `toggleDetail`, `isDetailOpen`, `getData`, `getRow`, `getApi`, `insertRow`, `updateRow`, `removeRow`, `getTotals` and `getOptions`. Before the table is built, or after it's gone, the methods that return something give `false`, `[]`, `{}` or `undefined`, and the others do nothing.
- `insertRow`, `updateRow` and `removeRow` change the table, but not your `data`. The next time `data` changes, the table shows `data` again. So in React, it's usually better to change your state instead.
- There is no `setData` on the ref. To change the rows, change `data`.
- `autoAdd={{ country: 'MA' }}` inline is fine: only new values rebuild the table.
- There is no `setEditable` on the ref either: change `editable`. It doesn't rebuild the table, so ticks, details and the page stay.
