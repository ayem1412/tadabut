---

## title: Columns and cells

# Columns and cells

What cells show, totals, and every column option.

The examples use the `Employee` type from the [quick start](../README.md#quick-start).

## What cells show

When a row isn't being edited, a cell shows its value as text. These change that:

- A select with a fixed list shows the option's label. A `countryId` of `1` shows "Morocco", with nothing to write.
- A select with `labelProp` shows that field of the row, like `cityName`. See [Chained selects](editing.md#chained-selects).
- A `money` editor shows its format, like `12 500.00`.
- A `date` editor shows its `display`, like `05/01/2024`.
- A `time` editor shows `09:05`, even when the data says `9:05:00`. A `datetime` editor shows its `display`, then the time, like `05/01/2024 14:30`.
- `render` sets the text yourself, on any column:

```ts
{ prop: 'salary', title: 'Salary', render: (value) => `${value} MAD` }
```

A few things to know:

- The order is: `render`, then the money or date format, then `labelProp`, then the fixed list's label, then the value itself.
- Text from `render` is shown as plain text, never as HTML. `<b>` shows as `<b>`, so text from a server can't break the page or run code. For HTML, return an element: see [Badges, links and icons](#badges-links-and-icons-html).
- Searching uses both the text and the raw value, so `12500` finds `12 500.00`, and a country's id finds "Morocco". Sorting uses the raw value, so `200 MAD` comes before `1000 MAD`. Dates and times are the exception: they sort by the real date and time. A city column sorts by id, not by name.
- An empty value (`null` or `undefined`) shows an empty cell. On a nullable column, `render` gets `null` too.
- Editors always get the raw value. After saving or cancelling, the text is worked out again.

### Badges, links and icons: `html`

`render` can also return an element, and it goes into the cell as it is. Build it with `html`: you write the HTML, and every `${…}` value is escaped, so text from a server stays text.

```ts
import { html } from 'tadabut';

{
  prop: 'status',
  title: 'Status',
  render: (value, row) => html`<span class="badge bg-${row.color}">${value}</span>`,
}
```

- If `value` is `<img onerror=…>`, the badge shows those characters, and nothing runs.
- `html` gives the element when you wrote one, or a fragment holding them all. It works in `detail` too.
- Return a new element each time. The same element given to two cells moves from one to the other.
- Search uses the element's visible text and the raw value. Sorting uses the raw value, like any column.
- Totals go through `render` too, so the footer can show an element.

Escaping doesn't protect everything:

- **Always put attributes in quotes:** `class="${x}"`, never `class=${x}`. Without quotes, a value with a space can add an attribute of its own.
- **Escaping doesn't check URLs:** `href="${url}"` with a `javascript:` URL from the server still runs when clicked. Check the URLs you put in links yourself.

There's no way to put an HTML string from your data straight into a cell, on purpose. If you really need it, build the element yourself.

In React, `render` returns text or an element too, not JSX: one React root per cell would make big tables slow. `html` works the same there.

## Totals

Give a column a `total`, and the table gets a footer line with it:

```ts
const columns: Column<Employee>[] = [
  { prop: 'name', title: 'Name' },
  { prop: 'age', title: 'Age', render: (value) => `${value} years`, total: 'avg' },
  { prop: 'salary', title: 'Salary', editor: { type: 'money' }, total: 'sum' },
];
```

| Name  | Age        | Salary     |
| ----- | ---------- | ---------- |
| …     | …          | …          |
| Total | 32.5 years | 176 651.50 |

| `total`    | Shows               | Columns |
| ---------- | ------------------- | ------- |
| `'sum'`    | everything added up | numbers |
| `'avg'`    | the average         | numbers |
| `'min'`    | the smallest        | numbers |
| `'max'`    | the biggest         | numbers |
| `'count'`  | how many rows       | any     |
| a function | what it returns     | any     |

- The total looks like the cells: a `money` column shows `176 651.50`, and a `render` is used too (`32.5 years`). Numbers are rounded to 2 decimals. `count` is always a plain number.
- `render` gets the total and an empty object as its row, since a total isn't a row. A `render` that reads other fields of the row should use the function form instead.
- Empty values (`null`) are skipped. With no values, a sum is `0` and the others show nothing.
- A function gets the counted rows and returns the text, shown as text, not HTML:

  ```ts
  { prop: 'active', title: 'Active', total: (rows) => `${rows.filter((row) => row.active).length} active` }
  ```

- `Total` goes in the first cell, unless that column has a total of its own. Change it with `texts: { total: 'Somme' }`.
- The totals update by themselves after a search, a page change, a save, an add, a delete or `setData`.
- TypeScript only allows `sum`, `avg`, `min` and `max` on number columns.

**Which rows count,** with `totalRows`:

| `totalRows`            | Counts                                           |
| ---------------------- | ------------------------------------------------ |
| `'searched'` (default) | every row that matches the search, on every page |
| `'all'`                | every row, whatever the search                   |
| `'page'`               | only the rows on the page shown                  |
| `'selected'`           | only the ticked rows, wherever they are          |

`'selected'` needs the checkbox column (`selection`), and Tadabut throws an error without it. The totals follow each tick, and ticked rows still count when the search hides them or they're on another page. With nothing ticked, a sum is `0`.

```ts
const table = new Tadabut(container, {
  data: invoices,
  rowId: 'id',
  columns: [
    { prop: 'number', title: 'Invoice' },
    { prop: 'amount', title: 'Amount', total: 'sum' },
  ],
  selection: true,
  totalRows: 'selected',
});
```

In TypeScript, the type of `totalRows` is `TotalScope`.

## Column options

A few more column settings, passed to DataTables:

```ts
const columns: Column<Employee>[] = [
  { prop: 'id', title: 'ID', width: '60px', className: 'dt-center' },
  { prop: 'name', title: 'Name', editor: { type: 'text' } },
  { prop: 'countryCode', title: 'Code', visible: false },
  { prop: 'salary', title: 'Salary', orderable: false, searchable: false },
];
```

| Option       | What it does                                                                |
| ------------ | --------------------------------------------------------------------------- |
| `width`      | the column's width, like `'60px'` or `'20%'`                                |
| `visible`    | `false` hides the column. Its value stays in the row, and `onSave` gets it. |
| `orderable`  | `false`: clicking the header doesn't sort by it                             |
| `searchable` | `false`: the search box ignores it                                          |
| `className`  | classes for the column's cells, header included                             |

`className` here is for the cells. The input's classes go in the editor's `className`.

A hidden column can't have an `editor`: nobody could see the input. Tadabut throws an error when you try.

---

[All guides](../README.md#guides) · [Editing](editing.md) →
