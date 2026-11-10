# ⵜⴰⴷⴰⴱⵓⵜ · Tadabut

[![CI](https://github.com/ayem1412/tadabut/actions/workflows/ci.yml/badge.svg)](https://github.com/ayem1412/tadabut/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![DataTables 3](https://img.shields.io/badge/DataTables-3.x-0d6efd)](https://datatables.net)
[![Status](https://img.shields.io/badge/status-early%20development-orange)](#roadmap)
[![npm](https://img.shields.io/npm/v/tadabut)](https://www.npmjs.com/package/tadabut)
[![Docs](https://img.shields.io/badge/docs-API%20reference-blue)](https://ayem1412.github.io/tadabut/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

Tadabut wraps [DataTables](https://datatables.net) and adds what it doesn't give you for free: editing rows, real inputs in the cells, and selects that depend on each other.

📖 [API reference](https://ayem1412.github.io/tadabut/): every option and type, from the code's own comments.

> [!WARNING]
> Tadabut is new. Until 1.0, the API can change between `0.x` versions, so pin the version you use and read the changelog before you update.

## Why

DataTables is great for showing data. Editing that data inside the table is a different story: you either buy the Editor extension or write a lot of code yourself. Tadabut is that code, written once.

- Edit a row in place, then save or cancel. Saving can be async. If it fails, the row stays open with what the user typed, so nothing is lost.
- Add a row from your own button: it opens at the top of the table, with the same inputs and validation.
- Delete a row, with a question first, or your own popup.
- Text, number, money, date, checkbox and select inputs, with validation.
- Selects that depend on another field, like country and city. Old requests get cancelled when the user changes their mind.
- Fully typed. The table knows what your rows look like, so a typo in a column name is a type error.
- No jQuery. It's built on DataTables 3, which doesn't need it anymore.

## Framework support

The core has no framework in it. Each framework gets a small adapter on top.

| Target     | Status    |
| ---------- | --------- |
| TypeScript | Supported |
| JavaScript | Supported |
| React      | Supported |
| Vue        | Planned   |
| jQuery     | Planned   |

## Requirements

- DataTables 3: `datatables.net`, or one of its styling packages like `datatables.net-dt`
- React 19, only if you use the React adapter
- A modern browser

## Installation

Install Tadabut with DataTables. `datatables.net-dt` is DataTables with its default look:

```sh
# npm
npm install tadabut datatables.net-dt

# pnpm
pnpm add tadabut datatables.net-dt

# Yarn
yarn add tadabut datatables.net-dt

# Bun
bun add tadabut datatables.net-dt

# Deno
deno add npm:tadabut npm:datatables.net-dt
```

For the React adapter, you also need React 19, which your app most likely has already.

Then import DataTables and its CSS once, before you create a table:

```ts
import 'datatables.net-dt';
import 'datatables.net-dt/css';
```

Tadabut works with any DataTables 3 styling package: `datatables.net-bs5` for Bootstrap 5, and so on.

## Usage

### Create a table

Give Tadabut the type of your rows. Every column's `prop` is checked against it.

The examples on this page all use this `Employee` type.

```ts
import 'datatables.net-dt';
import 'datatables.net-dt/css';
import { Tadabut, type Column } from 'tadabut';

type Employee = {
  id: number;
  name: string;
  age: number;
  salary: number;
  hiredAt: string; // 'YYYY-MM-DD'
  active: boolean;
  countryId: number | null;
  countryCode: string | null;
  cityId: number | null;
  cityName: string;
};

const employees: Employee[] = [
  {
    id: 1,
    name: 'Amina',
    age: 29,
    salary: 12000,
    hiredAt: '2024-01-05',
    active: true,
    countryId: 1,
    countryCode: 'MA',
    cityId: 10,
    cityName: 'Rabat',
  },
];

const columns: Column<Employee>[] = [
  { prop: 'id', title: 'ID' },
  { prop: 'name', title: 'Name' },
  { prop: 'age', title: 'Age' },
];

const container = document.querySelector<HTMLElement>('#employees')!;

const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
});
```

- The first argument is an empty element. Tadabut builds the table inside it.
- `rowId` is the property that identifies a row. Methods like `edit(id)` use it.
- A column without an `editor` can't be edited.

### Editable columns

Add an `editor` to a column to make it editable. Its `type` picks the input, and the options you can use with it.

```ts
const columns: Column<Employee>[] = [
  { prop: 'id', title: 'ID' },
  { prop: 'name', title: 'Name', editor: { type: 'text' } },
  { prop: 'age', title: 'Age', editor: { type: 'number', step: 1 } },
  { prop: 'hiredAt', title: 'Hired', editor: { type: 'date' } },
  { prop: 'active', title: 'Active', editor: { type: 'checkbox' } },
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
```

A select's values must have the same type as the column. `countryId` is a number, so `value: '1'` is a type error.

| Type       | Value                  | When empty  | Options                                        |
| ---------- | ---------------------- | ----------- | ---------------------------------------------- |
| `text`     | `string`               | `''`        | `minLength`, `maxLength`, `pattern`            |
| `number`   | `number`               | `null`      | `min`, `max`, `step`                           |
| `money`    | `number`               | `null`      | `min`, `max`, `decimals`, `separator`, `point` |
| `date`     | `string`               | `null`      | `min`, `max`                                   |
| `checkbox` | `boolean`, or `values` | never empty | `values`                                       |
| `select`   | same as the column     | `null`      | `options`, `dependsOn`, `labelProp`            |

Every editor also takes `className`, for your own CSS classes.

A few things to know:

- An empty number or date gives `null`, not `0` or `NaN`. A select with nothing picked gives `null` too.
- A checkbox shows `null` as unchecked, but keeps it: an untouched `null` is still `null` after saving. It only becomes `true` or `false` once the user clicks it.
- A `string | null` column gets the same editors as a `string` column. `null` shows as an empty input.
- Date columns must hold `'YYYY-MM-DD'`. Something like `'2024-01-05T00:00:00'` shows as empty, and saving turns it into `null`. Convert your dates first.

#### Checkboxes with your own values

Many databases store yes/no as `'O'`/`'N'`, `'Y'`/`'N'` or `1`/`0`. Give the checkbox the two values to use:

```ts
type Employee = { id: number; active: 'O' | 'N' | null };

const columns: Column<Employee>[] = [
  {
    prop: 'active',
    title: 'Active',
    className: 'dt-center', // centers the cell and the checkbox
    editor: { type: 'checkbox', values: { checked: 'O', unchecked: 'N' } },
    render: (value) => (value === 'O' ? 'Yes' : value === 'N' ? 'No' : ''),
  },
];
```

- The box is ticked only for the exact `checked` value. `'o'` isn't `'O'`, and `'1'` isn't `1`.
- Clicking writes `checked` or `unchecked`. A value that's neither, like `null` or an old `'X'`, shows unchecked and is kept as it is until the user clicks.
- `values` is required on `string` and `number` columns, and not allowed on `boolean` ones. Its values must fit the column, so `checked: 'Y'` on an `'O' | 'N'` column is a type error.
- The cell shows the raw value (`O`), like any column. Use `render` for "Yes"/"No", a ✓, or anything else.

#### Money

`money` is for `number` columns that hold amounts. It shows `12 500.00`, while typing and in the cells, but the row keeps a plain number (`12500`).

```ts
{ prop: 'salary', title: 'Salary', className: 'dt-right', editor: { type: 'money', min: 0 } }
```

- While typing, the thousands are grouped as you go, and the cursor stays where you're typing. The decimals are filled in when you leave the field: `12500` becomes `12 500.00`.
- Both `.` and `,` work as the decimal point. Letters are ignored, and a decimal too many is refused.
- The saved number is rounded to `decimals`, so `12.345` saves as `12.35`, never `12.345000001`.
- Empty gives `null`. `min`, `max` and `required` work like on `number`.
- The format is yours: `decimals` (default `2`), `separator` (default a space) and `point` (default `.`). For `12.500,00`, use `{ separator: '.', point: ',' }`. The separator and the point can't be the same: Tadabut throws an error if they are.
- The cells use the same format, without `render`. A `render` you write still wins, for a currency like `12 500.00 MAD`.

`formatMoney` and `defaultMoneyFormat` are exported, to show the same format in other places:

```ts
import { defaultMoneyFormat, formatMoney } from 'tadabut';

{ prop: 'bonus', title: 'Bonus', render: (value) => formatMoney(value, defaultMoneyFormat) }
```

### What cells show

When a row isn't being edited, a cell shows its value as text. These change that:

- A select with a fixed list shows the option's label. A `countryId` of `1` shows "Morocco", with nothing to write.
- A select with `labelProp` shows that field of the row, like `cityName`. See [Chained selects](#chained-selects).
- A `money` editor shows its format, like `12 500.00`.
- `render` sets the text yourself, on any column:

```ts
{ prop: 'salary', title: 'Salary', render: (value) => `${value} MAD` }
```

A few things to know:

- The order is: `render`, then the money format, then `labelProp`, then the fixed list's label, then the value itself.
- What `render` returns is shown as plain text, never as HTML. `<b>` shows as `<b>`, so text from a server can't break the page or run code.
- Searching uses both the text and the raw value, so `12500` finds `12 500.00`, and a country's id finds "Morocco". Sorting uses the raw value, so `200 MAD` comes before `1000 MAD`. A city column sorts by id, not by name.
- An empty value (`null` or `undefined`) shows an empty cell. On a nullable column, `render` gets `null` too.
- Editors always get the raw value. After saving or cancelling, the text is worked out again.

### Totals

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

### Column options

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

### DataTables settings

`dataTables` passes DataTables' own settings through as they are: paging, page sizes, the default order, the texts, and the settings of extensions like Buttons. See [DataTables' options](https://datatables.net/reference/option/) for the full list.

```ts
const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  dataTables: {
    order: [[1, 'asc']], // sort by the second column
    pageLength: 20,
    lengthMenu: [10, 20, 50, -1], // -1 means "All"
    language: {
      search: 'Rechercher :',
      lengthMenu: '_MENU_ lignes par page',
      info: 'Lignes _START_ à _END_ sur _TOTAL_',
      zeroRecords: 'Aucune ligne trouvée',
      paginate: { first: 'Premier', previous: 'Précédent', next: 'Suivant', last: 'Dernier' },
    },
  },
});
```

Columns are counted from 0, in the order of your `columns`. The Edit button column always comes last, so it never moves your columns.

Five settings aren't allowed, because Tadabut controls them:

- `data` and `columns`: Tadabut makes them from its own `data` and `columns`.
- `columnDefs`: use the column options above instead.
- `ajax` and `serverSide`: DataTables would load and replace rows behind Tadabut's back. Load the rows yourself and call `setData`.

These are type errors, and Tadabut's own values win even in plain JavaScript.

`language` only changes DataTables' texts. For Tadabut's own texts, see [Texts and translations](#texts-and-translations).

In React, keep `dataTables` outside your component or in a `useMemo`, like `columns`. A new object on every render rebuilds the table.

### Texts and translations

Tadabut's own texts (the Edit, Save, Cancel and Delete buttons, the delete question, "Loading…", and the error messages) are in English by default. French comes built in:

```ts
import { Tadabut, fr } from 'tadabut';

const table = new Tadabut(container, { data, columns, rowId: 'id', texts: fr });
```

Change only some of them, or write your own language. Whatever you leave out stays in English:

```ts
texts: { ...fr, save: 'Valider' }

texts: { edit: 'Bearbeiten', save: 'Speichern', cancel: 'Abbrechen' }
```

| Key                      | English                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `edit`, `save`, `cancel` | Edit, Save, Cancel                                                   |
| `delete`                 | Delete                                                               |
| `deleteQuestion`         | Delete this row?                                                     |
| `confirm`, `keep`        | Yes, delete / No                                                     |
| `loading`                | Loading…                                                             |
| `saveFailed`             | Could not save.                                                      |
| `addFailed`              | Could not add.                                                       |
| `deleteFailed`           | Could not delete.                                                    |
| `total`                  | Total                                                                |
| `selectRow`, `selectAll` | Select row / Select all (the checkboxes' labels, for screen readers) |
| `loadFailed`             | Could not load the options.                                          |
| `required`               | This field is required.                                              |
| `patternMismatch`        | Wrong format.                                                        |
| `tooShort`, `tooLong`    | Must be at least 2 characters.                                       |
| `tooSmall`, `tooLarge`   | Must be 18 or more.                                                  |
| `tooEarly`, `tooLate`    | Must be on or after 2020-01-01.                                      |

The messages with a number or a date are functions, so you can put the value where your language needs it:

```ts
texts: {
  tooSmall: (min) => `Mindestens ${min}.`;
}
```

`saveFailed`, `addFailed` and `deleteFailed` only show when `onSave`, `onAdd` or `onDelete` throws something that isn't an `Error`. When it throws an `Error`, its own message is shown.

DataTables' own texts (search, paging, "Showing 1 to 10") are set separately, with `dataTables.language`. See [DataTables settings](#datatables-settings).

In React, `texts={fr}` is fine. A new object on every render (like `texts={{ ...fr, save: 'Valider' }}` written inline) rebuilds the table each time, so put it in a constant or a `useMemo`.

### Styling

Tadabut doesn't ship any CSS. Everything it creates gets these classes, so you can style it however you want:

| Class                   | Used on                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `tdb-input`             | every input                                                 |
| `tdb-input-text`        | text inputs                                                 |
| `tdb-input-number`      | number inputs                                               |
| `tdb-input-money`       | money inputs                                                |
| `tdb-input-date`        | date inputs                                                 |
| `tdb-input-checkbox`    | checkboxes                                                  |
| `tdb-input-select`      | selects                                                     |
| `tdb-error`             | a field's error message, under its input                    |
| `tdb-row-error`         | the line (`<tr>`) under a row that failed to save or delete |
| `tdb-row-error-message` | the message inside that line                                |
| `tdb-row-editing`       | a row while it's being edited, and the new row              |
| `tdb-row-saving`        | a row while it's being saved, added or deleted              |
| `tdb-row-new`           | the new row `add()` opens                                   |
| `tdb-totals`            | the footer with the totals                                  |
| `tdb-new-rows`          | the `<tbody>` it lives in, above the others                 |
| `tdb-actions`           | the column with the buttons, header too                     |
| `tdb-button`            | every button                                                |
| `tdb-button-edit`       | the Edit button                                             |
| `tdb-button-save`       | the Save button                                             |
| `tdb-button-cancel`     | the Cancel button                                           |
| `tdb-button-delete`     | the Delete button                                           |
| `tdb-delete-question`   | the "Delete this row?" text                                 |
| `tdb-button-confirm`    | the "Yes, delete" button                                    |
| `tdb-button-keep`       | the "No" button                                             |
| `tdb-select`            | the checkbox column, header too                             |
| `tdb-select-row`        | a row's checkbox                                            |
| `tdb-select-all`        | the "check all" checkbox                                    |
| `tdb-row-selected`      | a selected row                                              |

To use Bootstrap, Tailwind or anything else, add your own classes. They always go next to the `tdb-` ones, never instead of them. There are two places:

- `className` on an editor, for its input.
- `classNames` on the table, for the `<table>` and the buttons.

```ts
const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns: [
    { prop: 'id', title: 'ID' },
    {
      prop: 'name',
      title: 'Name',
      editor: { type: 'text', className: 'w-full rounded border px-2 py-1' },
    },
  ],
  classNames: {
    table: 'w-full text-sm',
    button: 'rounded px-2 py-1',
    save: 'bg-blue-600 text-white',
  },
});
```

| `classNames` key | Added to                      |
| ---------------- | ----------------------------- |
| `table`          | the `<table>`                 |
| `button`         | every button                  |
| `edit`           | the Edit button only          |
| `save`           | the Save button only          |
| `cancel`         | the Cancel button only        |
| `delete`         | the Delete button only        |
| `confirm`        | the "Yes, delete" button only |
| `keep`           | the "No" button only          |
| `select`         | the selection checkboxes      |

All of them are optional. Tadabut doesn't know any CSS framework: it adds the classes you give it, and nothing else. If you use Tailwind: it only keeps classes it finds in your own files. Classes in your column config count, so they work.

DataTables' own parts (the search box, the page size, the paging buttons) are styled by the DataTables package you install: `datatables.net-dt` for the default look, `datatables.net-bs5` for Bootstrap 5, and so on.

#### With Bootstrap 5

Install the Bootstrap version of DataTables instead of `datatables.net-dt`, and Bootstrap itself:

```sh
pnpm add tadabut datatables.net-bs5 bootstrap
```

Import them once:

```ts
import 'bootstrap/dist/css/bootstrap.min.css';
import 'datatables.net-bs5';
import 'datatables.net-bs5/css';
```

Then give the editors and the table Bootstrap's classes:

```ts
const columns: Column<Employee>[] = [
  { prop: 'id', title: 'ID' },
  {
    prop: 'name',
    title: 'Name',
    editor: { type: 'text', className: 'form-control form-control-sm' },
  },
  {
    prop: 'countryId',
    title: 'Country',
    editor: {
      type: 'select',
      className: 'form-select form-select-sm',
      options: [
        { value: 1, label: 'Morocco' },
        { value: 2, label: 'France' },
      ],
    },
  },
  { prop: 'active', title: 'Active', editor: { type: 'checkbox', className: 'form-check-input' } },
];

const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  classNames: {
    table: 'table table-striped table-hover align-middle',
    button: 'btn btn-sm',
    edit: 'btn-outline-primary',
    save: 'btn-primary',
    cancel: 'btn-outline-secondary',
    delete: 'btn-outline-danger',
    confirm: 'btn-danger',
    keep: 'btn-outline-secondary',
  },
});
```

Error messages and the rows being edited need a few lines of your own CSS:

```css
/* Errors in Bootstrap's red. Use the message's class, not the row's:
   Bootstrap sets a color on every table cell. */
.tdb-error,
.tdb-row-error-message {
  color: var(--bs-form-invalid-color);
  font-size: 0.875em;
}

/* While editing, line the inputs up at the top, so an error under one
   input doesn't move the others. */
.table > tbody > tr.tdb-row-editing > td {
  vertical-align: top;
}

/* A checkbox is smaller than the inputs: move it down to their middle. */
.table > tbody > tr.tdb-row-editing .tdb-input-checkbox {
  margin-top: 0.5rem;
}

.tdb-row-saving {
  opacity: 0.5;
}

/* Space between the buttons, and after "Delete this row?". */
.tdb-button + .tdb-button {
  margin-left: 0.25rem;
}

.tdb-delete-question {
  margin-right: 0.5rem;
}
```

> [!TIP]
> Each DataTables styling package needs one exact version of `datatables.net`. Don't add `datatables.net` yourself next to it. If you have to, use the same version as the styling package. Two different versions means two copies of DataTables: the table works, but the Bootstrap look doesn't show up on the search box and the paging buttons.

### Custom editors

If the built-in inputs aren't enough, write your own. Select2, a date picker library, an input for a column that holds an object: anything works, on any column.

`create` runs every time a row starts being edited. It gets the starting value, the `className`, and an `onChange` function. It returns the editor.

Here is Select2:

```ts
import $ from 'jquery';
import 'select2';

const countryColumn: Column<Employee> = {
  prop: 'countryCode', // string | null
  title: 'Country',
  editor: {
    type: 'custom',
    create: (context) => {
      // Select2 adds its own elements next to the <select>,
      // so wrap it: the wrapper is what goes in the cell.
      const wrapper = document.createElement('div');
      const select = document.createElement('select');
      wrapper.appendChild(select);

      const $select = $(select).select2({
        width: '100%',
        data: [
          { id: 'MA', text: 'Morocco' },
          { id: 'FR', text: 'France' },
        ],
      });

      // Nothing picked gives null, not the text 'null'.
      const read = () => ($select.val() as string | null) ?? null;

      $select.val(context.value).trigger('change.select2');

      // The user picked something: tell Tadabut.
      $select.on('select2:select', () => context.onChange(read()));

      return {
        element: wrapper,
        getValue: read,
        // Update Select2's display only. This does not call onChange.
        setValue: (value) => $select.val(value).trigger('change.select2'),
        focus: () => $select.select2('open'),
        destroy: () => {
          $select.select2('destroy');
          wrapper.remove();
        },
      };
    },
  },
};
```

Rules for any custom editor:

- Call `context.onChange` when the user changes the value. Only then.
- `setValue` changes what's shown, without calling `onChange`.
- `destroy` cleans up everything, including the widget's own cleanup, then removes the element.
- On a nullable column, `context.value` can be `null`.

Select2 needs jQuery. Tadabut doesn't, so install jQuery yourself if you use Select2.

### Validation

`required` works on every editor. For anything the built-in rules don't cover, `validate` returns an error message, or `undefined` if the value is fine. It also gets the whole row.

```ts
{
  prop: 'age',
  title: 'Age',
  editor: {
    type: 'number',
    required: true,
    min: 18,
    validate: (value, row) =>
      row.active && value !== null && value > 65
        ? 'Active employees must be 65 or younger'
        : undefined,
  },
}
```

Built-in rules:

| Editor   | Rules                               |
| -------- | ----------------------------------- |
| text     | `minLength`, `maxLength`, `pattern` |
| number   | `min`, `max`                        |
| money    | `min`, `max`                        |
| date     | `min`, `max`                        |
| checkbox | none                                |
| select   | none                                |
| custom   | none                                |

The checks run in this order, and the first error wins:

1. Empty (`null`, `undefined` or `''`): an error if `required`. If not, nothing else is checked, so an empty optional field never fails `min` or your `validate`.
2. The built-in rules.
3. Your `validate`. It only runs if the built-in rules passed.

`pattern` has to match the whole value, like the HTML attribute. A checkbox is never empty, so `required` does nothing on it.

Errors show under their input when the user saves, and a row can't be saved until every field is valid. To change the messages, see [Texts and translations](#texts-and-translations).

### Chained selects

A select's `options` can be a function of the row instead of a fixed list. Add `dependsOn` and the select follows another field: when that field changes, the select is cleared and its options load again.

```ts
const columns: Column<Employee>[] = [
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
  {
    prop: 'cityId',
    title: 'City',
    editor: {
      type: 'select',
      required: true,
      dependsOn: 'countryId',
      labelProp: 'cityName',
      options: async (row, { signal }) => {
        if (row.countryId === null) return [];

        const res = await fetch(`/api/cities?country=${row.countryId}`, { signal });
        const cities: { id: number; name: string }[] = await res.json();
        return cities.map((city) => ({ value: city.id, label: city.name }));
      },
    },
  },
];
```

How it works:

- When a row opens, every `options` function runs with the row's values. The current value is kept while it loads, and picked once the options arrive.
- While loading, the select is disabled and shows "Loading…". A function that returns the list right away (no promise) skips that step. That's useful for filtering a list you already have.
- When a field changes, everything below it in the chain is cleared, then reloads. With Country → Region → City, changing the country clears both the region and the city.
- A cleared field is `null`, and the functions below it still run. That's why the example checks `row.countryId === null`. Returning `[]` right away costs nothing.
- If the user changes the country again before the cities come back, the old request is cancelled through `signal`. Pass it to `fetch` so the request really stops. Even if you don't, a late answer is thrown away.
- Cancelling or saving the row, `setData` and `destroy` cancel every request still running.
- In a new row (see [Adding](#adding)), nothing is picked yet, so the functions first run with an empty parent. Another reason to return `[]` for `null`.

If `options` throws, the select stays empty and "Could not load the options." shows under it. The row can't be saved while that message is there. Changing the field it depends on tries again, or the user can cancel the row.

`dependsOn` only works with a function. With a fixed list, it's a type error. It must be another field of the row, so a typo is a type error too.

#### Saving the label too: `labelProp`

The city's value is an id, like `12`, but people need to see "Casablanca". With options from a function, Tadabut only knows the names while the row is open, so it can't show them in the cell by itself. That's what `labelProp` is for: a field of the row where the picked option's label is saved.

With `labelProp: 'cityName'`:

- The cell shows `row.cityName`. No `render` needed.
- When the user picks Casablanca and saves, the row gets `cityId: 12` **and** `cityName: 'Casablanca'`. `onSave` gets both, and the cell shows the new name.
- Nothing picked saves `null` in both. `required` still stops the save.
- While the options are still loading, `cityName` keeps its old value, which is still right: the id didn't change either.

`labelProp` works with a fixed list too. It must be a text field of the row (`string`, nullable or optional ones too), so `labelProp: 'age'` is a type error. It can't be the column's own `prop`: saving would write the label over the id, so Tadabut throws an error.

### Saving

`onSave` gets the edited row and the row as it was before editing. It can be async.

```ts
import type { SaveContext } from 'tadabut';

async function saveEmployee(row: Employee, { previous }: SaveContext<Employee>) {
  console.log(`Saving ${previous.name} as ${row.name}`);

  const res = await fetch(`/api/employees/${row.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });

  if (!res.ok) throw new Error('Could not save the employee');

  // Optional: the server's version replaces the row.
  return (await res.json()) as Employee;
}

const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  onSave: saveEmployee,
});
```

What happens when you save:

1. Every field is validated. If one fails, its error shows under its input, the cursor goes to the first wrong field, and `onSave` isn't called.
2. The row is locked while `onSave` runs. Clicking or typing in it does nothing, and it gets the `tdb-row-saving` class.
3. If `onSave` works, the row closes and shows the new values. If you return a row, that one is used instead. That's handy for fields the server fills in, like `updatedAt`.
4. If `onSave` throws, the row stays open with everything the user typed, and your error message shows under the row. They can fix it and save again, or cancel.

The table's data only changes when saving works, so there's nothing to undo when it fails.

`onSave` is optional. Without it, saving just updates the table.

### Adding

Call `add()` from your own button. An empty row opens at the top of the table, with the same inputs, validation and Save/Cancel as an edited row. Save calls `onAdd`.

```ts
async function createEmployee(row: Partial<Employee>): Promise<Employee> {
  const res = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });

  if (!res.ok) throw new Error('Could not add the employee');

  return res.json(); // the row with its new id
}

const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  onSave: saveEmployee,
  onAdd: createEmployee,
});

addButton.addEventListener('click', () => table.add());
```

What happens:

1. `add()` opens the row at the top, with the cursor in the first input. Sorting, search and paging never move it: it lives in its own `<tbody>`, above the table's rows.
2. Save, or <kbd>Enter</kbd>, validates the fields. Cancel, or <kbd>Escape</kbd>, throws the row away.
3. `onAdd` gets the typed row. The row is locked while it runs.
4. If `onAdd` works, the row joins the table, and the table shows the page it landed on. If the search box hides it, the table stays where it is.
5. If `onAdd` throws, the row stays open with what the user typed, and your error message shows under it.

**What `onAdd` gets and returns:**

- It gets a `Partial` row, because the row isn't saved yet: the id, and columns without an editor, are only there if you gave them to `add()`. TypeScript makes you check them.
- Return the saved row, usually with the id the server made, or nothing to keep the row as typed.
- Either way, the row must have its `rowId`. If it doesn't, Tadabut throws `Tadabut: the added row has no "id". Return it from onAdd.` That's a mistake in your code, so it goes to the console, and the row stays open.
- Without `onAdd`, the row is added as typed. That's fine for a table that only lives in the page, as long as the id comes from an input or from `add({ id })`.

**Starting values:** `table.add({ country: 'MA', active: true })`. Inputs start with them, and columns without an editor show them as text. Those cells don't use the column's `render`.

**Rules:**

- One new row at a time. `add()` returns `false` if one is already open.
- In `'single'` mode, the new row counts as the open row: you can't add while a row is edited, and you can't edit while the new row is open. In `'multiple'` mode, both work together.
- `setData` and `destroy` throw the new row away, like any open row.

### Deleting

Give the table an `onDelete`, and each row gets a Delete button next to Edit. It can be async, like `onSave`.

```ts
async function deleteEmployee(row: Employee) {
  const res = await fetch(`/api/employees/${row.id}`, { method: 'DELETE' });

  if (!res.ok) throw new Error('Could not delete the employee');
}

const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  onSave: saveEmployee,
  onDelete: deleteEmployee,
});
```

What happens when you click Delete:

1. The buttons are replaced by "Delete this row? [Yes, delete] [No]". The cursor goes to No, so pressing <kbd>Enter</kbd> by reflex doesn't delete anything.
2. No puts Edit and Delete back.
3. Yes calls `onDelete` with the row. The row is locked while it runs, and gets the `tdb-row-saving` class.
4. If `onDelete` works, the row is removed. You stay on the same page.
5. If `onDelete` throws, the row stays, and your error message shows under it.

A row that's being edited has Save and Cancel instead, so it can't be deleted halfway through an edit. `onDelete` needs a `rowId`, and Tadabut throws an error without one.

#### Your own question: `confirmDelete`

```ts
confirmDelete: false, // delete right away, no question

confirmDelete: (row) => window.confirm(`Delete ${row.name}?`), // the browser's popup

// any modal, as long as it returns true to delete
confirmDelete: async (row) => {
  const result = await Swal.fire({ title: `Delete ${row.name}?`, showCancelButton: true });
  return result.isConfirmed;
},
```

Leave it out for the question in the row. To only change its words, use `texts` (`deleteQuestion`, `confirm`, `keep`). To style it, use `classNames` (`delete`, `confirm`, `keep`).

### Selecting rows

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

### Events

Six callbacks tell you what happened. Each one gets the row:

| Option             | When                                   | Gets                  |
| ------------------ | -------------------------------------- | --------------------- |
| `onEditStart`      | a row opens for editing                | `(row)`               |
| `onSaved`          | after a save worked and the row closed | `(row, { previous })` |
| `onAdded`          | after a new row joined the table       | `(row)`               |
| `onDeleted`        | after a row left the table             | `(row)`               |
| `onRowClick`       | a row is clicked                       | `(row, event)`        |
| `onRowDoubleClick` | a row is double-clicked                | `(row, event)`        |

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
- Tadabut doesn't wait for the "after" callbacks, so async is fine. If one throws, the table is already done: the error goes to the console, and `save()` or `saveNew()` rejects.

**Which clicks count:** clicks on buttons, inputs, checkboxes, labels and links don't, and neither do clicks in the checkbox and buttons cells (a click that just missed a button). Clicks in a row being edited, the new row, the header, the footer or an error line don't count either. `onRowClick` works without `rowId` and without editors.

**Double clicks:** the browser fires two clicks before a double click, so `onRowClick` runs twice before `onRowDoubleClick`. Tadabut doesn't wait to tell them apart, because that would make every single click feel slow.

**Double click to edit:**

```ts
editing: { doubleClick: true },
```

Double-clicking a row then opens it, the same as its Edit button: `onEditStart` and the `'single'` mode still apply. `onRowDoubleClick` still fires, after the row opened.

### Editing options

When at least one column has an `editor`, the table gets one more column at the end, with an Edit button in each row. While a row is being edited, its Edit button is replaced by Save and Cancel. The labels can be changed with `texts`.

`editing` changes how that works:

```ts
const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  onSave: saveEmployee,
  editing: {
    mode: 'multiple', // default: 'single'
    button: false, // default: true. false hides the edit button
    doubleClick: true, // default: false. true opens a row on double click
  },
});
```

- `'single'` mode: one row at a time. You can't start a new edit while another row is open.
- `'multiple'` mode: several rows can be open. Each one saves on its own, so `onSave` runs once per row.
- `doubleClick: true`: double-clicking a row opens it. See [Events](#events).
- `button: false`: no Edit button. Start edits from your own code, or with `doubleClick`. <kbd>Enter</kbd> and <kbd>Escape</kbd> still work. With `onDelete`, the column stays, with only the Delete button.

### Controlling it from code

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

table.setData(newEmployees); // replace all rows, keeps sorting and search
table.destroy(); // remove everything Tadabut created
```

`edit` returns `true` if editing started. It returns `false` when the row doesn't exist, it's already open, another row is open in `'single'` mode, no column has an editor, `onEditStart` returned `false`, or the row is on a page that hasn't been shown yet. DataTables only builds a row's cells once it's shown, so go to that page first.

`save` returns a promise of `true` if the row was saved and closed, `false` if it wasn't: a field is invalid, `onSave` failed, the row isn't being edited, or it's already saving.

`cancel` does nothing if the row isn't being edited, or while it's saving.

`delete` never asks first: only the Delete button does. It returns a promise of `true` once the row is removed, `false` if it wasn't: the row doesn't exist, it's being edited, it's already being deleted, or `onDelete` failed. Without `onDelete`, it just removes the row.

`add` returns `true` if the new row opened, `false` if one is already open, no column has an editor, or a row is being edited in `'single'` mode. `saveNew` works like `save`, and throws if the saved row has no id. `cancelNew` does nothing while `onAdd` runs.

`select` skips ids that aren't in the table. `onSelect` is only called when something really changed. `getSelected` gives the rows in the order they were added, including rows hidden by the search or on other pages. Without `selection`, these do nothing, and `getSelected` gives `[]`.

`setData` and `destroy` cancel any row being edited, and the new row, first. Unsaved changes are lost.

<kbd>Enter</kbd> saves the row you're in. <kbd>Escape</kbd> cancels it. If something else already used the key, like Select2 picking an option with <kbd>Enter</kbd>, Tadabut leaves it alone.

### React

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
- `onSave`, `onAdd`, `onDelete`, `confirmDelete`, `onSelect` and the [events](#events) can be new functions on every render. The table always calls the latest ones.
- In `onAdd` and `onDelete`, update your state too, like above. Otherwise the next time `data` changes, the new row disappears, or the deleted one comes back.
- `totalRows` is a plain string, so writing it inline is fine. Changing it rebuilds the table, to count other rows.
- `selection={{ checkAll: 'page' }}` inline is fine too: only turning it on or off, or changing `checkAll`, rebuilds the table. A rebuild clears the selection.
- `editing` can be a new object on every render too. The table is only rebuilt when `mode`, `button` or `doubleClick` really change. Changing `columns`, `rowId` or `editing` closes any row being edited.
- The ref has the same methods as the core: `edit`, `save`, `cancel`, `delete`, `isEditing`, `add`, `saveNew`, `cancelNew`, `isAdding`, `getSelected`, `isSelected`, `select`, `deselect` and `clearSelection`. Before the table is built, or after it's gone, the methods that return something give `false` (`[]` for `getSelected`), and the others do nothing.
- There is no `setData` on the ref. To change the rows, change `data`.

## Roadmap

Done:

- [x] Project setup
- [x] Thin wrapper: typed columns, data loading, cleanup
- [x] React adapter
- [x] Inputs: text, number, date, checkbox, select
- [x] Custom editors (Select2, date pickers, …)
- [x] Row editing: save, cancel, validation errors
- [x] Chained selects
- [x] Show labels instead of raw values in cells
- [x] First release (0.1.0)
- [x] Your own classes on the table and buttons (`classNames`), and a Bootstrap 5 recipe
- [x] API reference site
- [x] Pass DataTables settings through (paging, page sizes, default order, language, extensions like Buttons), and column `width`, `visible`, `orderable`, `searchable` and `className`
- [x] Selects that also save their label in the row (`labelProp`), so the cell shows the new label after a save
- [x] Translations for Tadabut's own texts (buttons and error messages), French built in
- [x] Deleting rows, with a question first that you can replace (`confirmDelete`)
- [x] Adding new rows, at the top of the table (`add()` and `onAdd`)
- [x] Checkboxes with your own values, like `'O'` and `'N'` instead of `true` and `false`
- [x] Money inputs, formatted while typing (`12 500.00`)
- [x] Totals in the footer: sum, average, min, max, count or your own
- [x] A checkbox column to select rows, with "check all"
- [x] More events: when editing starts (and stopping it), after saving, adding and deleting, row click and double click, and double click to edit

Next, roughly in this order:

- [ ] Dates as `dd/mm/yyyy`, in the input and when sorting
- [ ] Detail rows that open under a row
- [ ] Time and read-only inputs
- [ ] Methods to read rows (`getData`, `getRow`), put a row in directly without opening it, and reach the DataTables API
- [ ] Keyboard navigation and theming

Later: popup editing, changing many rows in one go, server-side mode, Vue and jQuery adapters.

## Contributing

Help is welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) to get set up, and please follow the [code of conduct](./CODE_OF_CONDUCT.md).

## Not affiliated with DataTables

Tadabut is an independent project. It isn't made by SpryMedia or the DataTables team, and it doesn't contain any code from DataTables Editor.

## License

[MIT](./LICENSE) © Anas Youssef ELMAHDAD
