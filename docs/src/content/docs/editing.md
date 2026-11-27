---
title: 'Editing'
description: 'The editors, validation, chained selects, and saving, adding and deleting rows.'
---

The editors, validation, chained selects, and saving, adding and deleting rows.

The examples use the `Employee` type from the [quick start](getting-started.mdx#quick-start).

## Editable columns

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

<div data-demo="editors"></div>

A select's values must have the same type as the column. `countryId` is a number, so `value: '1'` is a type error.

| Type       | Value                  | When empty  | Options                                        |
| ---------- | ---------------------- | ----------- | ---------------------------------------------- |
| `text`     | `string`               | `''`        | `minLength`, `maxLength`, `pattern`            |
| `number`   | `number`               | `null`      | `min`, `max`, `step`                           |
| `money`    | `number`               | `null`      | `min`, `max`, `decimals`, `separator`, `point` |
| `date`     | `string`               | `null`      | `min`, `max`, `format`, `display`              |
| `time`     | `string`               | `null`      | `min`, `max`, `seconds`                        |
| `datetime` | `string`               | `null`      | `min`, `max`, `format`, `display`, `seconds`   |
| `checkbox` | `boolean`, or `values` | never empty | `values`                                       |
| `select`   | same as the column     | `null`      | `options`, `dependsOn`, `labelProp`            |

Every editor also takes `className`, for your own CSS classes, and `readOnly`. See [Read-only fields](#read-only-fields).

A few things to know:

- An empty number, date or time gives `null`, not `0` or `NaN`. A select with nothing picked gives `null` too.
- A checkbox shows `null` as unchecked, but keeps it: an untouched `null` is still `null` after saving. It only becomes `true` or `false` once the user clicks it.
- A `string | null` column gets the same editors as a `string` column. `null` shows as an empty input.
- Date columns hold `'YYYY-MM-DD'` unless you give a `format`. See [Dates](#dates).

### Read-only fields

Add `readOnly: true` to any editor, and the field shows in a locked input while the row is edited:

```ts
{ prop: 'code', title: 'Code', editor: { type: 'text', readOnly: true } }
```

- The user sees the value but can't change it. The browser greys the input out, and Tab skips it.
- Saving keeps the value the row had, even one the input can't show, like a date with a time.
- It's never checked: `required`, `min`, `validate` and the others are skipped, since the user couldn't fix it anyway.
- In the new row from `add()`, it shows the value you passed to `add()`, or nothing, and stays locked. Good for fields your server fills in, like a reference number. The cursor starts in the first field that isn't read-only.
- It works on every editor, `custom` too: your `create` gets `context.readOnly`, and should disable its input.
- The cell keeps the editor's format, so a read-only `date` or `money` column still shows and sorts like the others.

### Checkboxes with your own values

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

### Money

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

### Dates

`date` is for `string` columns. The input is the browser's date picker. By default, the rows hold `'2024-01-05'` (year first). If your server sends another order, say so with `format`, and pick what the cells show with `display`:

```ts
{
  prop: 'hiredAt',
  title: 'Hired',
  editor: { type: 'date', format: 'dd/mm/yyyy', min: '01/01/2000' },
}
```

- `format` is how the date is written in your rows: what the server sends, and what `onSave` gets back. It defaults to `'yyyy-mm-dd'`.
- `display` is how the cells show it. It defaults to `format`. With ISO data and `display: 'dd/mm/yyyy'`, the cells show `05/01/2024`, but the rows keep `'2024-01-05'`.
- Both take `dd`, `mm` and `yyyy` in any order, with `/`, `-` or `.` between them: `'dd/mm/yyyy'`, `'mm-dd-yyyy'`, `'dd.mm.yyyy'`, and so on. TypeScript catches a typo like `'dd/mm-yyyy'`.
- `min` and `max` are written in `format` too. Tadabut throws an error if they aren't real dates in that format.
- Sorting uses the real date, whatever the format. `'12/01/2023'` comes before `'05/01/2024'`.
- A time after the date is dropped: `'2024-01-05T10:30:00'` shows the 5th, and saves as `'2024-01-05'`.
- A value that isn't a real date in `format`, like `'31/02/2024'`, shows as it is in the cell, so you can see it. The input shows it as empty, and saving turns it into `null`.
- The picker itself shows the date the way the computer's language does. A French computer shows `05/01/2024` and an American one `01/05/2024`. Browsers don't let a page change that.

`parseDate`, `formatDate` and `defaultDateFormat` are exported, to read and write the same formats elsewhere. `parseDate` gives `'yyyy-mm-dd'`, or `null` if it isn't a real date:

```ts
import { formatDate, parseDate } from 'tadabut';

parseDate('05/01/2024', 'dd/mm/yyyy'); // '2024-01-05'
formatDate('2024-01-05', 'dd.mm.yyyy'); // '05.01.2024'
```

A column you can't edit has no date editor, so for now, show its dates with `render`: `render: (value) => formatDate(value, 'dd/mm/yyyy')`. It sorts by the raw value, which is right for ISO dates.

### Times

`time` is for `string` columns that hold a time of day, like `'14:30'`. The input is the browser's time picker.

```ts
{ prop: 'starts', title: 'Starts', editor: { type: 'time', min: '08:00', max: '18:00' } }
```

- It reads `'9:05'`, `'09:05'` and `'09:05:00'`. What comes after the seconds is ignored, like `.000` from some servers.
- It saves `'hh:mm'`. With `seconds: true`, the picker shows the seconds and it saves `'hh:mm:ss'`.
- The cells show `hh:mm` (or `hh:mm:ss`), and sorting uses the real time: `9:05` comes before `14:30`.
- `min` and `max` are times too. Tadabut throws an error if they aren't real times.
- A value that isn't a time, like `'25:00'`, shows as it is in the cell, and as empty in the input.

### Dates with a time

`datetime` is for `string` columns that hold a date and a time. The input is the browser's date-and-time picker.

```ts
{
  prop: 'lastLogin',
  title: 'Last login',
  editor: { type: 'datetime', format: 'dd/mm/yyyy', min: '01/01/2020 08:00' },
}
```

<div data-demo="dates"></div>

- The rows hold the date in `format`, a space, then the time: `'05/01/2024 14:30'`. With the default ISO `format`, a `T` goes between them instead, as servers send it: `'2024-01-05T14:30'`.
- `format`, `display` and `seconds` work like for [dates](#dates) and [times](#times). The cells always use a space: `05/01/2024 14:30`.
- When reading, a `T` and a space both work, and a date with no time counts as midnight.
- What comes after the seconds is ignored, a time zone too: `'2024-01-05T14:30:00Z'` shows 14:30, as written, not converted to the user's time.
- `min` and `max` are written like the data. Tadabut throws an error if they aren't real, or aren't in `format`.
- Sorting uses the real date and time, whatever `display` is.

`parseTime`, `formatTime`, `parseDateTime` and `formatDateTime` are exported, like the date helpers:

```ts
import { parseDateTime, parseTime } from 'tadabut';

parseTime('9:05'); // '09:05:00'
parseDateTime('05/01/2024 14:30', 'dd/mm/yyyy'); // '2024-01-05T14:30:00'
```

## Custom editors

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

## Validation

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

<div data-demo="validation"></div>

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

Errors show under their input when the user saves, and a row can't be saved until every field is valid. To change the messages, see [Texts and translations](styling.md#texts-and-translations).

## Chained selects

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

<div data-demo="chained-selects"></div>

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

### Saving the label too: `labelProp`

The city's value is an id, like `12`, but people need to see "Casablanca". With options from a function, Tadabut only knows the names while the row is open, so it can't show them in the cell by itself. That's what `labelProp` is for: a field of the row where the picked option's label is saved.

With `labelProp: 'cityName'`:

- The cell shows `row.cityName`. No `render` needed.
- When the user picks Casablanca and saves, the row gets `cityId: 12` **and** `cityName: 'Casablanca'`. `onSave` gets both, and the cell shows the new name.
- Nothing picked saves `null` in both. `required` still stops the save.
- While the options are still loading, `cityName` keeps its old value, which is still right: the id didn't change either.

`labelProp` works with a fixed list too. It must be a text field of the row (`string`, nullable or optional ones too), so `labelProp: 'age'` is a type error. It can't be the column's own `prop`: saving would write the label over the id, so Tadabut throws an error.

## Saving

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
3. If `onSave` works, the row closes and shows the new values. If you return a row, that one is used instead. That's handy for fields the server fills in, like `updatedAt`. It must keep its `rowId` value, or Tadabut throws an error.
4. If `onSave` throws, the row stays open with everything the user typed, and your error message shows under the row. They can fix it and save again, or cancel.

The table's data only changes when saving works, so there's nothing to undo when it fails.

`onSave` is optional. Without it, saving just updates the table.

## Adding

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
- The id must also be new. If a row with that id is already in the table, Tadabut throws `Tadabut: the added row has the id 1, which is already in the table.` and the row stays open. With `server` there's no check, because the server decides which rows come back.
- Without `onAdd`, the row is added as typed. That's fine for a table that only lives in the page, as long as the id comes from an input or from `add({ id })`.

**Starting values:** `table.add({ country: 'MA', active: true })`. Inputs start with them, and columns without an editor show them as text. Those cells don't use the column's `render`.

To start a field with what's typed in the search box: `table.add({ name: table.getApi().search() })`.

**Rules:**

- One new row at a time. `add()` returns `false` if one is already open.
- In `'single'` mode, the new row counts as the open row: you can't add while a row is edited, and you can't edit while the new row is open. In `'multiple'` mode, both work together.
- `setData` and `destroy` throw the new row away, like any open row.

### A new row that's always open: `autoAdd`

For typing many rows one after the other:

```ts
const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  onAdd: addEmployee,
  autoAdd: { country: 'MA' }, // or true, for no starting values
});
```

<div data-demo="auto-add"></div>

- The new row opens by itself once the table is built, after each `setData`, after each add, and after `setEditable(true)`.
- When it opens by itself, the cursor doesn't move, so a `setData` doesn't steal it from your filters. Right after an add, the cursor goes into the next new row, because the user is already typing in the table.
- After Cancel or <kbd>Escape</kbd>, it stays closed until the next `setData`.
- In `'single'` mode it makes way for Edit: clicking Edit closes it, losing what was typed, and it comes back once that row is saved or cancelled. A new row opened with `add()` still blocks Edit, as above.
- It waits while editing is off.
- `autoAdd` needs a column with an `editor`, and Tadabut throws an error without one.

## Deleting

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

### Your own question: `confirmDelete`

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

## Editing options

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
- `doubleClick: true`: double-clicking a row opens it. See [Events](events.md).
- `button: false`: no Edit button. Start edits from your own code, or with `doubleClick`. <kbd>Enter</kbd> and <kbd>Escape</kbd> still work. With `onDelete`, the column stays, with only the Delete button.

### Turning editing off

```ts
const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  onSave: saveEmployee,
  editable: user.canEdit, // default: true
});

table.setEditable(false); // read-only from now on
table.setEditable(true); // editable again
table.isEditable(); // false while it's off
```

<div data-demo="editable"></div>

While editing is off:

- The buttons column is hidden, and the `<table>` gets the `tdb-readonly` class, for your CSS.
- `edit`, `add` and `delete` do nothing and give `false`. So the Edit and Delete buttons and the double click do nothing either. `onEditStart` and `onDelete` aren't called.
- Checkboxes, details, the current row, row clicks, and `insertRow`, `updateRow` and `removeRow` still work.

Turning it off cancels every open row and the new row, and their unsaved changes are lost. A row that is saving, adding or deleting finishes first. If its save fails, the row goes back to its old values and the error shows under it. If the new row's add fails, it's thrown away.
