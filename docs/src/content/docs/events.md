---
title: 'Events'
description: 'Knowing when something happened: the on… options and table.on().'
---

Knowing when something happened: the `on…` options and `table.on()`.

The examples use the `Employee` type from the [quick start](getting-started.mdx#quick-start).

Seven callbacks tell you what happened. Each one gets the row:

| Option             | When                                            | Gets                  |
| ------------------ | ----------------------------------------------- | --------------------- |
| `onEditStart`      | a row opens for editing                         | `(row)`               |
| `onSaved`          | after a save worked and the row closed          | `(row, { previous })` |
| `onAdded`          | after a new row joined the table                | `(row)`               |
| `onDeleted`        | after a row left the table                      | `(row)`               |
| `onRowClick`       | a row is clicked                                | `(row, event)`        |
| `onRowDoubleClick` | a row is double-clicked                         | `(row, event)`        |
| `onCurrentChange`  | the highlighted row changed (with `currentRow`) | `(row)`, or `null`    |

```ts
const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  onSave: saveEmployee,
  onEditStart: (row) => row.status !== 'validated', // false keeps the row closed
  onSaved: (row, { previous }) => toast(`${previous.name} saved`),
  onRowClick: (row) => showDetails(row),
});
```

- `onSave`, `onAdd` and `onDelete` do the work and can fail. `onSaved`, `onAdded` and `onDeleted` come after, once it worked and the table changed. They're never called when it failed.
- They're called the same way from the buttons and from code: `table.edit(1)` calls `onEditStart`, and `await table.save(1)` calls `onSaved`.
- `onEditStart` can return `false` to keep the row closed, for rows a user can't change. `edit()` then returns `false`. It's not called for the new row `add()` opens, and it can't be async.
- `onSaved` gets the row as it now is in the table (what `onSave` returned, if anything), and the row before editing.
- Tadabut doesn't wait for the "after" callbacks, so async is fine. If one throws, the table is already done: the error goes to the console, and nothing else stops.

**Which clicks count:** clicks on buttons, inputs, checkboxes, labels and links don't, and neither do clicks in the checkbox and buttons cells (a click that just missed a button). Clicks in a row being edited, the new row, the header, the footer or an error line don't count either. `onRowClick` works without `rowId` and without editors.

**Double clicks:** the browser fires two clicks before a double click, so `onRowClick` runs twice before `onRowDoubleClick`. Tadabut doesn't wait to tell them apart, because that would make every single click feel slow.

**Double click to edit:**

```ts
editing: { doubleClick: true },
```

Double-clicking a row then opens it, the same as its Edit button: `onEditStart` and the `'single'` mode still apply. `onRowDoubleClick` still fires, after the row opened.

### Listening from anywhere: `table.on()`

The options only work where the table is built. `table.on()` works anywhere you have the table, as many times as you want, and can stop:

```ts
const stop = table.on('saved', (row, { previous }) => refreshSummary());
table.on('select', (rows) => (deleteButton.disabled = rows.length === 0));

stop(); // or table.off('saved', sameFunction)
```

| Event            | Same as            | Gets                  |
| ---------------- | ------------------ | --------------------- |
| `saved`          | `onSaved`          | `(row, { previous })` |
| `added`          | `onAdded`          | `(row)`               |
| `deleted`        | `onDeleted`        | `(row)`               |
| `select`         | `onSelect`         | `(rows)`              |
| `currentChange`  | `onCurrentChange`  | `(row)`, or `null`    |
| `rowClick`       | `onRowClick`       | `(row, event)`        |
| `rowDoubleClick` | `onRowDoubleClick` | `(row, event)`        |

- The option runs first, then the listeners in the order you added them. The same function added twice runs once.
- A listener that throws doesn't stop the others, or the table: its error shows in the console.
- `destroy()` removes every listener.
- Only for things that happened. The callbacks that decide something stay options: `onSave`, `onAdd`, `onDelete`, `onEditStart` and `confirmDelete`. With many listeners, there'd be no clear answer to "which one decides?"
- In TypeScript, a wrong event name is an error, and each listener knows its arguments.
- In React, use the props: listeners added to the ref's table would be lost each time it's rebuilt.
