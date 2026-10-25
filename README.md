# Tadabut · ⵜⴰⴷⴰⴱⵓⵜ

A typed wrapper for [DataTables](https://datatables.net) that adds row editing, rich inputs and chained selects, with a modern, promise-based API.

> **Status: early development.** Nothing is published yet and the API will change. Not ready for production use.

## Why

DataTables is a great table library, but editing data inside the table needs extra work. Tadabut adds that layer on top of DataTables 3:

- **Row editing** — turn a row into inputs, then save or cancel. Saving is async, and failed saves roll back.
- **Rich inputs** — text, number, date, checkbox and select, with validation.
- **Chained selects** — a select whose options depend on another field (country → city), with out-of-date requests cancelled automatically.
- **Fully typed** — the table knows the shape of your rows, so column names and field options are checked by TypeScript.
- **No jQuery** — built on DataTables 3, which no longer needs it.

## Framework support

Tadabut has a framework-free core and thin adapters on top.

| Target     | Status      |
| ---------- | ----------- |
| TypeScript | In progress |
| JavaScript | In progress |
| React      | In progress |
| Vue        | Planned     |
| jQuery     | Planned     |

## Requirements

- DataTables 3 (`datatables.net` or one of its styling packages, like `datatables.net-dt`)
- React 19, only if you use the React adapter
- A modern browser

## Installation

Not published yet.

## Usage

> **Planned API.** This section describes where Tadabut is going, not what works today. It will change as it gets built.

### Create a table

Tell Tadabut what a row looks like. Every column `prop` is then checked against it, so a typo like `prop: 'nmae'` is a type error.

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

- The first argument is an empty container. Tadabut creates the table inside it.
- `rowId` names the property that identifies each row. Methods like `edit(id)` use it.
- Columns without an `editor` are read-only.

### Editable columns

Add an `editor` to a column to make it editable. The `type` decides which input is shown and which options are allowed.

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

A select's values have the same type as the column. `countryId` is a `number`, so `{ value: '1', … }` is a type error.

| Type       | Value type        | When empty  | Extra options                       |
| ---------- | ----------------- | ----------- | ----------------------------------- |
| `text`     | `string`          | `''`        | `minLength`, `maxLength`, `pattern` |
| `number`   | `number`          | `null`      | `min`, `max`, `step`                |
| `date`     | `string`          | `null`      | `min`, `max` (both `'YYYY-MM-DD'`)  |
| `checkbox` | `boolean`         | never empty | —                                   |
| `select`   | the column's type | `null`      | `options`, `dependsOn`              |

Every editor also accepts `className`, for extra CSS classes on the input.

- **Empty values.** An empty number or date input gives `null`, never `0` or `NaN`. A select with nothing picked gives `null`, and so does a select whose value matches no option. A checkbox is always `true` or `false`, and a `null` value shows as unchecked.
- **Nullable columns.** A `string | null` column gets the same editors as a `string` column. `null` shows as an empty input.
- **Dates.** A date column must hold exactly `'YYYY-MM-DD'`. Any other format, like `'2024-01-05T00:00:00'`, shows as an empty input, and saving turns it into `null`. Convert dates before giving them to the table.

### Styling

Tadabut adds no styles of its own. Every input it creates gets stable class names, so you can style them with any CSS:

| Class                | On            |
| -------------------- | ------------- |
| `tdb-input`          | every input   |
| `tdb-input-text`     | text inputs   |
| `tdb-input-number`   | number inputs |
| `tdb-input-date`     | date inputs   |
| `tdb-input-checkbox` | checkboxes    |
| `tdb-input-select`   | selects       |

To use your own framework's classes, add `className` to any editor. It is added next to the `tdb-…` classes.

```ts
// Bootstrap
{ prop: 'name', title: 'Name', editor: { type: 'text', className: 'form-control' } }

// Tailwind
{ prop: 'name', title: 'Name', editor: { type: 'text', className: 'w-full rounded border px-2 py-1' } }
```

Tailwind only keeps classes it finds in your source files. Classes written in your column config are found, so they work.

The table itself is styled by the DataTables package you pick: `datatables.net-dt` for the default look, `datatables.net-bs5` for Bootstrap 5, and so on.

### Custom editors

When the built-in inputs aren't enough, build your own: a Select2 dropdown, a date picker library, or an input for a column that holds an object. A custom editor works on any column.

`create` is called each time a row starts being edited. It receives the starting value, the `className`, and an `onChange` to call when the user changes the value. It returns the live editor.

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

What matters in any custom editor:

- Call `context.onChange` when **the user** changes the value, and only then.
- `setValue` shows a new value **without** calling `onChange`.
- `destroy` cleans up everything, including the widget's own cleanup (`select2('destroy')` here), before removing the element.
- On a nullable column, `context.value` can be `null`.

Select2 needs jQuery. Tadabut doesn't, so you install jQuery along with Select2.

### Validation

Common rules go directly on the editor. For anything else, `validate` returns an error message, or nothing when the value is fine.

```ts
{
  prop: 'age',
  title: 'Age',
  editor: {
    type: 'number',
    required: true,
    min: 18,
    validate: (value, row) =>
      row.active && value > 65 ? 'Active employees must be 65 or younger' : undefined,
  },
}
```

Errors are shown under the input. Saving is blocked until every field is valid.

### Chained selects

A select can depend on another field. Its `options` is then a function that receives the current row. When the parent value changes, the child is cleared and its options are loaded again.

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

If the user changes the country again before the cities arrive, the old request is cancelled through `signal`. Pass it to `fetch` so old answers never show up.

### Saving

`onSave` receives the edited row and the row as it was before. Return a promise.

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

- **Success:** the row shows the new values. If you return a row, it is used instead (useful for fields the server sets, like `updatedAt`).
- **Failure:** throw. The row goes back to its old values and the error message is shown on the row.

### Editing options

When at least one column has an `editor`, each row gets an edit button. The `editing` option changes how editing works:

```ts
const table = new Tadabut<Employee>(container, {
  data: employees,
  rowId: "id",
  columns,
  onSave: saveEmployee,
  editing: {
    mode: "multiple", // default: 'single'
    button: false, // default: true — hide the edit button
  },
});
```

- **`mode: 'single'`** — one row at a time. Starting a new edit is blocked while another row is open.
- **`mode: 'multiple'`** — several rows can be open at once. Each row saves on its own, and `onSave` is called once per row.
- **`button: false`** — no edit button. Start edits from your own code instead.

### Controlling it from code

```ts
table.edit(5); // start editing the row with id 5
table.save(5); // save it
table.cancel(5); // cancel and restore its old values

table.setData(newEmployees); // replace all rows, keeps sorting and search
table.destroy(); // remove everything Tadabut created
```

In `single` mode the id can be left out: `save()` and `cancel()` act on the open row.

Keyboard: <kbd>Enter</kbd> saves the row you're in, <kbd>Escape</kbd> cancels it.

### React

Same options, as props. Define `columns` outside the component (or with `useMemo`) so they don't change on every render.

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

- When `employees` changes, the table updates in place. It is not rebuilt.
- The ref gives you the same methods as the core: `edit`, `save`, `cancel`, `setData`.

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

Later: adding and deleting rows, popup editing, bulk editing, server-side mode, Vue and jQuery adapters.

## Development

Want to help? Read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

Requires Node 22.18+ and pnpm.

```sh
pnpm install
pnpm dev        # open the playground
pnpm test       # run tests in watch mode
pnpm check      # lint, typecheck, test and build — run before pushing
```

Other scripts:

| Script           | What it does                    |
| ---------------- | ------------------------------- |
| `pnpm build`     | Build the library into `dist/`  |
| `pnpm typecheck` | Check types only                |
| `pnpm lint`      | Check formatting and lint rules |
| `pnpm format`    | Fix formatting and sort imports |

### Branches and releases

Tadabut uses [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow):

- `master` always works. Nothing is pushed to it directly.
- Each change gets its own short branch: `feat/…`, `fix/…`, `docs/…` or `chore/…`.
- Each branch is merged through a pull request, once CI passes.
- Releases are tags on `master` (`v0.1.0`, `v0.2.0`, …), following [semver](https://semver.org).

To release, on a `chore/release-x.y.z` branch:

1. Bump `version` in `package.json` (before 1.0: `0.0.x` for fixes, `0.x.0` for features or breaking changes).
2. Update this README (roadmap, framework status, usage).
3. Merge to `master`, then tag the merge commit and push the tag.

## Not affiliated with DataTables

Tadabut is an independent project. It is not made by or affiliated with SpryMedia or the DataTables project. It does not use or include code from DataTables Editor.

## License

[MIT](./LICENSE) © Anas Youssef ELMAHDAD
