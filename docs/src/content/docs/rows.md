---
title: 'Rows'
description: 'Selecting rows, the current row, detail rows, and working with rows from code.'
---

Selecting rows, the current row, detail rows, and working with rows from code.

The examples use the `Employee` type from the [quick start](getting-started.mdx#quick-start).

## Selecting rows

Turn on `selection`, and the table gets a checkbox column at the start, with a "check all" box in the header:

```ts
const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  selection: true,
  onSelect: (rows) => console.log(`${rows.length} selected`),
});

table.getSelected(); // the selected rows
```

- Ticks are kept by row id, so they stay when you change page, sort or search.
- `onSelect` gets every selected row each time the selection changes, from a click or from code.
- The header box is ticked when every row it takes is selected, and shows a dash when only some are.
- A selected row gets the `tdb-row-selected` class. Tadabut doesn't color it: that's your CSS.
- Rows that leave the table, after a delete or `setData`, are unselected.
- The new row `add()` opens has no checkbox until it's saved.
- `selection` needs a `rowId`, and Tadabut throws an error without one.

**Which rows "check all" takes,** with `checkAll`:

```ts
selection: { checkAll: 'page' },
```

| `checkAll`             | Takes                                            |
| ---------------------- | ------------------------------------------------ |
| `'searched'` (default) | every row that matches the search, on every page |
| `'all'`                | every row, whatever the search                   |
| `'page'`               | only the rows on the page shown                  |

Rows you ticked that "check all" doesn't take stay ticked: unticking it only unselects the rows it takes.

Your `order` in `dataTables` still counts your own columns: `[[0, 'asc']]` is your first column, not the checkboxes.

## The current row

```ts
const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  currentRow: true,
  onCurrentChange: (row) => showDetails(row), // null when nothing is highlighted
});

table.getCurrent(); // the highlighted row
```

- Clicking a row highlights it. Only one row is highlighted at a time, and clicking it again removes the highlight.
- The same clicks count as for `onRowClick`: see [Events](events.md). A double click leaves the row highlighted.
- The highlighted row gets the `tdb-row-current` class, `aria-current="true"`, and your `classNames.current`. Tadabut doesn't color it: with Bootstrap, `current: 'table-active'` does it.
- It's not the same as the checkboxes: a row can be ticked, highlighted, or both.
- It's kept by row id, so it stays when you change page, sort or search, and after the row is saved.
- When the row leaves the table, after a delete, `removeRow` or `setData`, nothing is highlighted anymore, and `onCurrentChange` gets `null`.
- In `onRowClick`, `table.isCurrent(row.id)` already tells you if that click turned the highlight on.
- `currentRow` needs a `rowId`, and Tadabut throws an error without one.

## Detail rows

Give `detail` a function, and each row gets a ▸ button at the start. Clicking it opens a line under the row with what the function returns:

```ts
const table = new Tadabut(container, {
  data: orders,
  rowId: 'id',
  columns,
  detail: async (row, { signal }) => {
    const res = await fetch(`/api/orders/${row.id}/lines`, { signal });
    const lines: { label: string }[] = await res.json();

    const list = document.createElement('ul');

    for (const line of lines) {
      const item = document.createElement('li');
      item.textContent = line.label;
      list.append(item);
    }

    return list;
  },
});
```

- It returns an element, or a string. A string is shown as plain text, never as HTML, so text from a server can't break the page. To show HTML, build the elements yourself.
- It can be async. "Loading…" shows while it waits. If it throws, the error message shows in the line.
- Pass `signal` to `fetch`. It's aborted when the detail closes before it finished loading, so a slow request stops instead of showing up late.
- Several details can be open at once.
- The ▸ button comes after the selection checkboxes and before your columns. Your `order` in `dataTables` still counts from your first column.
- `detail` needs a `rowId`, and Tadabut throws an error without one.

**What happens to an open detail when…**

- **You sort, search or change page:** it stays open, and comes back when its row is shown again.
- **The row is being edited:** it stays open.
- **The row is saved:** `detail` runs again, so it shows the new values.
- **A save or delete fails:** the error shows under the detail. Neither one replaces the other.
- **The row is deleted, `setData` runs, or the table is destroyed:** it closes, and a load still running is stopped.

**Open it on a row click** instead of, or as well as, the button:

```ts
onRowClick: (row) => table.toggleDetail(row.id),
```

## Controlling it from code

```ts
table.edit(5); // start editing the row with id 5
await table.save(5); // validate and save it
table.cancel(5); // cancel and restore its old values
table.isEditing(5); // true while row 5 is open
await table.delete(5); // call onDelete, then remove the row

table.add({ country: 'MA' }); // open a new row at the top
await table.saveNew(); // validate it and call onAdd
table.cancelNew(); // throw the new row away
table.isAdding(); // true while the new row is open

table.select([1, 2]); // tick rows 1 and 2
table.deselect([2]); // untick row 2
table.clearSelection(); // untick every row
table.isSelected(1); // true while row 1 is ticked
table.getSelected(); // the ticked rows

table.setCurrent(3); // highlight row 3
table.setCurrent(null); // highlight nothing
table.isCurrent(3); // true while row 3 is highlighted
table.getCurrent(); // the highlighted row, or undefined

table.openDetail(1); // open row 1's detail
table.closeDetail(1); // close it
table.toggleDetail(1); // open it if closed, close it if open
table.isDetailOpen(1); // true while it's open, or loading

table.setEditable(false); // turn editing off, see Turning editing off
table.setData(newEmployees); // replace all rows, keeps sorting and search
table.destroy(); // remove everything Tadabut created
```

See [Reading and changing rows](#reading-and-changing-rows) for `getData`, `insertRow` and the others.

`edit` returns `true` if editing started. It returns `false` when the row doesn't exist, it's already open, another row is open in `'single'` mode, no column has an editor, `onEditStart` returned `false`, or the row is on a page that hasn't been shown yet. DataTables only builds a row's cells once it's shown, so go to that page first.

`save` returns a promise of `true` if the row was saved and closed, `false` if it wasn't: a field is invalid, `onSave` failed, the row isn't being edited, or it's already saving.

`cancel` does nothing if the row isn't being edited, or while it's saving.

`delete` never asks first: only the Delete button does. It returns a promise of `true` once the row is removed, `false` if it wasn't: the row doesn't exist, it's being edited, it's already being deleted, or `onDelete` failed. Without `onDelete`, it just removes the row.

`add` returns `true` if the new row opened, `false` if one is already open, no column has an editor, or a row is being edited in `'single'` mode. `saveNew` works like `save`, and throws if the saved row has no id, or an id that's already in the table. `cancelNew` does nothing while `onAdd` runs.

`select` skips ids that aren't in the table. `onSelect` is only called when something really changed. `getSelected` gives the rows in the order they were added, including rows hidden by the search or on other pages. Without `selection`, these do nothing, and `getSelected` gives `[]`. The detail methods do nothing without `detail`, and `isDetailOpen` gives `false`.

`setCurrent` never removes the highlight from the row you give it, unlike a click. It returns `false` if no row has that id, or without `currentRow`. `onCurrentChange` is only called when the highlight really moved. `getCurrent` gives a copy.

`setData` and `destroy` cancel any row being edited, and the new row, first. Unsaved changes are lost.

<kbd>Enter</kbd> saves the row you're in. <kbd>Escape</kbd> cancels it. If something else already used the key, like Select2 picking an option with <kbd>Enter</kbd>, Tadabut leaves it alone.

## Reading and changing rows

```ts
table.getData(); // every row, in the order shown
table.getData('searched'); // only the rows that match the search ('page': only this page)
table.getRow(5); // the row with id 5, or undefined

table.insertRow(rowFromServer); // put a row in, or an array of rows
table.updateRow({ ...table.getRow(5), name: 'Nadia' }); // replace row 5
table.removeRow(5); // take row 5 out

table.getTotals(); // { salary: 176651.5, age: 32.5 }
table.getOptions('countryId'); // [{ value: 1, label: 'Morocco' }, …]
table.getApi(); // DataTables itself
```

**Reading**

- `getData` and `getRow` give **copies**. Changing them changes nothing in the table: use `updateRow` for that.
- `getData` follows the sorting. Its scope works like `totalRows`: `'all'` (the default), `'searched'` or `'page'`.
- `getRow` gives the saved row. While a row is being edited, what's typed isn't in it until Save.

**Changing**

`insertRow`, `updateRow` and `removeRow` change the table from your code, for example when your server pushes a change. They skip the server callbacks and their events: no `onAdd`/`onAdded`, `onSave`/`onSaved`, `onDelete`/`onDeleted`, and `removeRow` never asks. Everything else follows:

- The totals update.
- An open detail reloads after `updateRow`, and closes after `removeRow`.
- A removed row leaves the selection, and `onSelect` is called.
- The table stays on the page it's on.

When they can't:

- `updateRow` and `removeRow` return `false`, and change nothing, when no row has that id, or the row is being edited or deleted. That way, a change from the server never wipes what the user is typing.
- `insertRow` throws if a row has no id, or its id is already in the table (or twice in the array). Either every row goes in, or none.
- `updateRow` takes a whole row. To change one field, spread the current one: `{ ...table.getRow(5), name: 'Nadia' }`.

**Totals and options**

- `getTotals` gives the footer's totals by field: plain numbers for `sum`, `avg`, `min`, `max` and `count`, rounded like the footer but not formatted, or your function's text. They count the same rows as the footer.
- `getOptions` gives a select's options. With a fixed list, that list. With an `options` function, the list it last loaded in an open row, or `undefined` before any row was opened. It gives `undefined` for a column that isn't a select.

**DataTables itself**

`getApi` gives the DataTables API, for anything Tadabut doesn't do, like `table.getApi().order([2, 'desc']).draw()`. Don't add or remove rows through it: that skips Tadabut, so the selection, details and open rows won't know. Use the methods above, or `setData`.
