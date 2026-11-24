---
title: 'Big tables (server-side)'
description: 'Loading one page at a time from your server, for tables too big to load at once.'
---

Loading one page at a time from your server, for tables too big to load at once.

The examples use the `Employee` type from the [quick start](getting-started.mdx#quick-start).

## When you need it

By default, you give Tadabut every row with `data`, and DataTables does the paging, sorting and search in the browser. That's simple and fast up to a few thousand rows.

With tens of thousands of rows, loading them all is too slow. Give `server` instead of `data`: Tadabut then asks your server for one page each time the user changes page, sorts or searches, and the browser only holds that page.

## The `server` function

It gets what the table needs, and returns the rows of that page and how many there are in all:

```ts
const table = new Tadabut<Employee>(container, {
  server: async ({ start, length, order, search }, { signal }) => {
    const params = new URLSearchParams({
      start: String(start),
      length: String(length),
      search,
      order: order.map(({ prop, dir }) => `${prop}:${dir}`).join(','),
    });
    const res = await fetch(`/api/employees?${params}`, { signal });
    const { rows, count } = await res.json();

    return { rows, count };
  },
  rowId: 'id',
  columns,
});
```

<div data-demo="server"></div>

What it gets:

| Field    | What it is                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start`  | The index of the page's first row, from 0. Page 3 with 10 rows a page starts at 20.                                                                           |
| `length` | Rows per page. `-1` when the user picked "All".                                                                                                               |
| `order`  | How to sort, like `[{ prop: 'name', dir: 'asc' }]`. Field names, not column numbers. Shift+click sorts by several columns. Empty when the table isn't sorted. |
| `search` | What's in the search box, `''` when it's empty. Typing waits 400 ms after the last key before asking.                                                         |

`signal` is aborted when a newer request replaces this one, for example when the user clicks two pages quickly. Pass it to `fetch`. Tadabut ignores an answer that comes too late anyway.

What it returns:

| Field      | What it is                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `rows`     | The rows of the page.                                                                                                |
| `count`    | How many rows match the search, on every page. DataTables counts the pages with it.                                  |
| `countAll` | Optional. How many rows there are before the search, for "(filtered from 5,000 total entries)". Defaults to `count`. |
| `totals`   | Optional. The footer's totals, by field. See [Totals](#totals).                                                      |

`server` can't go with `data`: Tadabut throws if you give both.

### With jQuery

`$.ajax` returns something you can `await`, so it works the same way:

```js
server: async (request) => {
  const reply = await $.ajax({
    url: '/employees/page',
    method: 'POST',
    data: JSON.stringify(request),
    contentType: 'application/json',
  });
  return { rows: reply.rows, count: reply.count };
};
```

## Filters outside the table

When the page has its own filters, like a year or a status, read them inside `server`, and call `reload()` when they change. It asks for the page again, keeping the page, sorting and search:

```ts
const year = document.querySelector<HTMLSelectElement>('#year');

const table = new Tadabut<Employee>(container, {
  server: async (request, { signal }) => {
    const res = await fetch('/api/employees/page', {
      method: 'POST',
      body: JSON.stringify({ ...request, year: year.value }),
      signal,
    });
    return res.json();
  },
  rowId: 'id',
  columns,
});

year.addEventListener('change', () => table.reload());
```

## Totals

The browser only has one page, so it can't add up the others. Send the totals from the server, by field, for the columns with a `total`:

```ts
return { rows, count, totals: { salary: 176651.5 } };
```

They're formatted like the cells, and go through the column's `render`, as usual. If a column has a `total` and the server sends nothing for it, its footer cell stays empty, and the console warns once.

`totalRows: 'selected'` is the exception: the browser counts the ticked rows itself, since it keeps them (see below). `table.getTotals()` gives what the footer shows.

## Saving, adding and deleting

`onSave`, `onAdd` and `onDelete` work as without `server`. What happens after:

- **Save:** the row changes where it is, without asking the server for the page again. If the change would move it, like a new name when the table is sorted by name, it stays put until the next load.
- **Add and delete:** the page loads again, since the server decides where rows go. With `autoAdd`, the next new row opens with the cursor in it once the page is back.

## Changing page, sorting and searching

Each one loads new rows, like `setData`:

- Open rows, and the new row, close without saving.
- Open details close.
- The highlight (`currentRow`) goes away if its row isn't on the new page, and `onCurrentChange` gets `null`.

Ticked rows stay ticked, even on other pages: Tadabut keeps a copy of each. `getSelected()` returns them in the order they were ticked. The header checkbox ticks the current page only.

## When the server fails

If `server` throws, the old rows stay, and the error's message shows on a line above the table, as text (`texts.rowsFailed` if what was thrown isn't an `Error`). The next good load removes the line. Style it with the `tdb-load-error` class:

```css
.tdb-load-error {
  margin-bottom: 0.5rem;
  color: #c62828;
}
```

The page number at the bottom has already moved to the page that failed, because DataTables moves it before asking. The next good load fixes it.

## What changes from code

- `getData()` and `getRow()` only see the current page.
- `updateRow()` works on the current page, without asking the server.
- `setData()`, `insertRow()` and `removeRow()` throw: the server owns the rows. Use `reload()`.
- `reload()` throws without `server`: use `setData()`.

## In React

The same `server` prop. A new function on each render doesn't rebuild the table, so it can be inline, and `reload()` is on the ref:

```tsx
const ref = useRef<TadabutHandle<Employee>>(null);

<Tadabut
  ref={ref}
  server={(request, { signal }) => loadEmployees(request, year, signal)}
  columns={columns}
  rowId="id"
/>;

useEffect(() => ref.current?.reload(), [year]);
```

That effect also runs once when the page opens, so the first page loads twice. If that matters, skip the first run with a ref.

Switching between `data` and `server` rebuilds the table.
