# Tadabut · ⵜⴰⴷⴰⴱⵓⵜ

[![CI](https://github.com/ayem1412/tadabut/actions/workflows/ci.yml/badge.svg)](https://github.com/ayem1412/tadabut/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![DataTables 3](https://img.shields.io/badge/DataTables-3.x-0d6efd)](https://datatables.net)
[![Status](https://img.shields.io/badge/status-early%20development-orange)](#roadmap)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

Tadabut wraps [DataTables](https://datatables.net) and adds what it doesn't give you for free: editing rows, real inputs in the cells, and selects that depend on each other.

> [!WARNING]
> Tadabut is in early development. It is not on npm yet, and the API will change. Don't use it in production.

## Why

DataTables is great for showing data. Editing that data inside the table is a different story: you either buy the Editor extension or write a lot of code yourself. Tadabut is that code, written once.

- Edit a row in place, then save or cancel. Saving is async. If it fails, the row goes back to its old values.
- Text, number, date, checkbox and select inputs, with validation.
- Selects that depend on another field, like country and city. Old requests get cancelled when the user changes their mind.
- Fully typed. The table knows what your rows look like, so a typo in a column name is a type error.
- No jQuery. It's built on DataTables 3, which doesn't need it anymore.

## Framework support

The core has no framework in it. Each framework gets a small adapter on top.

| Target     | Status      |
| ---------- | ----------- |
| TypeScript | In progress |
| JavaScript | In progress |
| React      | In progress |
| Vue        | Planned     |
| jQuery     | Planned     |

## Requirements

- DataTables 3: `datatables.net`, or one of its styling packages like `datatables.net-dt`
- React 19, only if you use the React adapter
- A modern browser

## Installation

Not on npm yet.

## Usage

> [!NOTE]
> This is the planned API. Parts of it don't work yet, and it may change while it gets built.

### Create a table

Give Tadabut the type of your rows. Every column's `prop` is checked against it.

```ts
import { Tadabut, type Column } from "tadabut";
import "datatables.net-dt";
import "datatables.net-dt/css";

type Employee = {
  id: number;
  name: string;
  age: number;
  hiredAt: string; // 'YYYY-MM-DD'
  active: boolean;
  countryId: number;
  cityId: number;
};

const columns: Column<Employee>[] = [
  { prop: "id", title: "ID" },
  { prop: "name", title: "Name" },
  { prop: "age", title: "Age" },
];

const table = new Tadabut<Employee>(document.querySelector("#employees")!, {
  data: employees,
  rowId: "id",
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
  { prop: "id", title: "ID" },
  { prop: "name", title: "Name", editor: { type: "text" } },
  { prop: "age", title: "Age", editor: { type: "number", step: 1 } },
  { prop: "hiredAt", title: "Hired", editor: { type: "date" } },
  { prop: "active", title: "Active", editor: { type: "checkbox" } },
  {
    prop: "countryId",
    title: "Country",
    editor: {
      type: "select",
      options: [
        { value: 1, label: "Morocco" },
        { value: 2, label: "France" },
      ],
    },
  },
];
```

A select's values must have the same type as the column. `countryId` is a number, so `value: '1'` is a type error.

| Type       | Value              | When empty  | Options                             |
| ---------- | ------------------ | ----------- | ----------------------------------- |
| `text`     | `string`           | `''`        | `minLength`, `maxLength`, `pattern` |
| `number`   | `number`           | `null`      | `min`, `max`, `step`                |
| `date`     | `string`           | `null`      | `min`, `max`                        |
| `checkbox` | `boolean`          | never empty | none                                |
| `select`   | same as the column | `null`      | `options`, `dependsOn`              |

Every editor also takes `className`, for your own CSS classes.

A few things to know:

- An empty number or date gives `null`, not `0` or `NaN`. A select with nothing picked gives `null` too.
- A checkbox is always `true` or `false`. A `null` value shows as unchecked.
- A `string | null` column gets the same editors as a `string` column. `null` shows as an empty input.
- Date columns must hold `'YYYY-MM-DD'`. Something like `'2024-01-05T00:00:00'` shows as empty, and saving turns it into `null`. Convert your dates first.

### Styling

Tadabut doesn't ship any CSS. Everything it creates gets these classes, so you can style it however you want:

| Class                | Used on                                   |
| -------------------- | ----------------------------------------- |
| `tdb-input`          | every input                               |
| `tdb-input-text`     | text inputs                               |
| `tdb-input-number`   | number inputs                             |
| `tdb-input-date`     | date inputs                               |
| `tdb-input-checkbox` | checkboxes                                |
| `tdb-input-select`   | selects                                   |
| `tdb-error`          | a field's error message, under its input  |
| `tdb-save-error`     | the error under a row that failed to save |
| `tdb-row-saving`     | a row while it's being saved              |

To use Bootstrap, Tailwind or anything else, put your classes in `className`. They get added next to the `tdb-` ones.

```ts
// Bootstrap
{ prop: 'name', title: 'Name', editor: { type: 'text', className: 'form-control' } }

// Tailwind
{ prop: 'name', title: 'Name', editor: { type: 'text', className: 'w-full rounded border px-2 py-1' } }
```

If you use Tailwind: it only keeps classes it finds in your own files. Classes in your column config count, so they work.

The table itself is styled by the DataTables package you install: `datatables.net-dt` for the default look, `datatables.net-bs5` for Bootstrap 5, and so on.

### Custom editors

If the built-in inputs aren't enough, write your own. Select2, a date picker library, an input for a column that holds an object: anything works, on any column.

`create` runs every time a row starts being edited. It gets the starting value, the `className`, and an `onChange` function. It returns the editor.

Here is Select2:

```ts
import $ from "jquery";
import "select2";

const countryColumn: Column<Employee> = {
  prop: "countryCode", // string | null
  title: "Country",
  editor: {
    type: "custom",
    create: (context) => {
      // Select2 adds its own elements next to the <select>,
      // so wrap it: the wrapper is what goes in the cell.
      const wrapper = document.createElement("div");
      const select = document.createElement("select");
      wrapper.appendChild(select);

      const $select = $(select).select2({
        width: "100%",
        data: [
          { id: "MA", text: "Morocco" },
          { id: "FR", text: "France" },
        ],
      });

      // Nothing picked gives null, not the text 'null'.
      const read = () => ($select.val() as string | null) ?? null;

      $select.val(context.value).trigger("change.select2");

      // The user picked something: tell Tadabut.
      $select.on("select2:select", () => context.onChange(read()));

      return {
        element: wrapper,
        getValue: read,
        // Update Select2's display only. This does not call onChange.
        setValue: (value) => $select.val(value).trigger("change.select2"),
        focus: () => $select.select2("open"),
        destroy: () => {
          $select.select2("destroy");
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
| date     | `min`, `max`                        |
| checkbox | none                                |
| select   | none                                |
| custom   | none                                |

The checks run in this order, and the first error wins:

1. Empty (`null`, `undefined` or `''`): an error if `required`. If not, nothing else is checked, so an empty optional field never fails `min` or your `validate`.
2. The built-in rules.
3. Your `validate`. It only runs if the built-in rules passed.

`pattern` has to match the whole value, like the HTML attribute. A checkbox is never empty, so `required` does nothing on it.

Messages are in English for now. You'll be able to change them when translations are added. Errors will show under the input once row editing is done, and a row can't be saved until every field is valid.

### Chained selects

A select can depend on another field. Its `options` becomes a function that gets the current row. When the other field changes, the select is cleared and its options load again.

```ts
{
  prop: 'cityId',
  title: 'City',
  editor: {
    type: 'select',
    dependsOn: 'countryId',
    options: async (row, { signal }) => {
      const res = await fetch(`/api/cities?country=${row.countryId}`, { signal });
      return res.json(); // [{ value, label }, …]
    },
  },
}
```

If the user changes the country again before the cities come back, the old request is cancelled through `signal`. Pass it to `fetch` so a late answer never shows up.

### Saving

`onSave` gets the edited row and the row as it was before editing. It can be async.

```ts
const table = new Tadabut<Employee>(container, {
  data: employees,
  rowId: "id",
  columns,
  onSave: async (row, { previous }) => {
    const res = await fetch(`/api/employees/${row.id}`, {
      method: "PUT",
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error("Could not save the employee");
    return res.json(); // optional: the server's version replaces the row
  },
});
```

What happens when you save:

1. Every field is validated. If one fails, its error shows under its input, the cursor goes to the first wrong field, and `onSave` isn't called.
2. The row is locked while `onSave` runs. Clicking or typing in it does nothing, and it gets the `tdb-row-saving` class.
3. If `onSave` works, the row closes and shows the new values. If you return a row, that one is used instead. That's handy for fields the server fills in, like `updatedAt`.
4. If `onSave` throws, the row stays open with everything the user typed, and your error message shows under the row. They can fix it and save again, or cancel.

The table's data only changes when saving works, so there's nothing to undo when it fails.

`onSave` is optional. Without it, saving just updates the table.

### Editing options

When at least one column has an `editor`, every row gets an edit button. `editing` changes how that works:

```ts
const table = new Tadabut<Employee>(container, {
  data: employees,
  rowId: "id",
  columns,
  onSave: saveEmployee,
  editing: {
    mode: "multiple", // default: 'single'
    button: false, // default: true. false hides the edit button
  },
});
```

- `'single'` mode: one row at a time. You can't start a new edit while another row is open.
- `'multiple'` mode: several rows can be open. Each one saves on its own, so `onSave` runs once per row.
- `button: false`: no edit button. Start edits from your own code.

### Controlling it from code

```ts
table.edit(5); // start editing the row with id 5
await table.save(5); // validate and save it
table.cancel(5); // cancel and restore its old values
table.isEditing(5); // true while row 5 is open

table.setData(newEmployees); // replace all rows, keeps sorting and search
table.destroy(); // remove everything Tadabut created
```

`edit` returns `true` if editing started. It returns `false` when the row doesn't exist, another row is already open, or the row is on a page that hasn't been shown yet. DataTables only builds a row's cells once it's shown, so go to that page first.

`save` returns a promise of `true` if the row was saved and closed, `false` if it wasn't: a field is invalid, `onSave` failed, the row isn't being edited, or it's already saving.

`cancel` does nothing if the row isn't being edited, or while it's saving.

`setData` and `destroy` cancel any row being edited first. Unsaved changes are lost.

In `'single'` mode you can leave out the id: `save()` and `cancel()` use the open row.

<kbd>Enter</kbd> saves the row you're in. <kbd>Escape</kbd> cancels it.

### React

Same options, as props. Keep `columns` outside your component, or in a `useMemo`, so it doesn't change on every render.

```tsx
import { useRef } from "react";
import type { Column } from "tadabut";
import { Tadabut, type TadabutHandle } from "tadabut/react";

const columns: Column<Employee>[] = [
  // …same as above
];

export function Employees({ employees }: { employees: Employee[] }) {
  const tableRef = useRef<TadabutHandle<Employee>>(null);

  return (
    <>
      <button type="button" onClick={() => tableRef.current?.edit(5)}>
        Edit employee 5
      </button>

      <Tadabut<Employee>
        ref={tableRef}
        data={employees}
        rowId="id"
        columns={columns}
        onSave={saveEmployee}
      />
    </>
  );
}
```

- When `employees` changes, the table updates in place. It doesn't get rebuilt.
- The ref has the same methods as the core: `edit`, `save`, `cancel`, `setData`.

## Roadmap

- [x] Project setup
- [x] Thin wrapper: typed columns, data loading, cleanup
- [x] React adapter
- [ ] Inputs: text, number, date, checkbox, select
- [ ] Custom editors (Select2, date pickers, …)
- [ ] Row editing: save, cancel, validation, rollback
- [ ] Chained selects
- [ ] Keyboard support, translations, theming
- [ ] First release (0.1.0)

Later: adding and deleting rows, popup editing, editing many rows at once, server-side mode, Vue and jQuery adapters.

## Contributing

Help is welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) to get set up, and please follow the [code of conduct](./CODE_OF_CONDUCT.md).

## Not affiliated with DataTables

Tadabut is an independent project. It isn't made by SpryMedia or the DataTables team, and it doesn't contain any code from DataTables Editor.

## License

[MIT](./LICENSE) © Anas Youssef ELMAHDAD
