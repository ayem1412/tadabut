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
  country: string;
  city: string;
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
    prop: "country",
    title: "Country",
    editor: {
      type: "select",
      options: [
        { value: "MA", label: "Morocco" },
        { value: "FR", label: "France" },
      ],
    },
  },
];
```

| Type       | Value type | Extra options                       |
| ---------- | ---------- | ----------------------------------- |
| `text`     | `string`   | `minLength`, `maxLength`, `pattern` |
| `number`   | `number`   | `min`, `max`, `step`                |
| `date`     | `string`   | `min`, `max` (both `'YYYY-MM-DD'`)  |
| `checkbox` | `boolean`  | —                                   |
| `select`   | `string`   | `options`, `dependsOn`              |

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
  prop: 'city',
  title: 'City',
  editor: {
    type: 'select',
    dependsOn: 'country',
    options: async (row, { signal }) => {
      const res = await fetch(`/api/cities?country=${row.country}`, { signal });
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

### Starting an edit

By default, each row gets an edit button. You can also control editing from code:

```ts
table.edit(5); // start editing the row with id 5
table.save(); // save the row being edited
table.cancel(); // cancel and restore the old values

table.setData(newEmployees); // replace all rows, keeps sorting and search
table.destroy(); // remove everything Tadabut created
```

Keyboard: <kbd>Enter</kbd> saves, <kbd>Escape</kbd> cancels.

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
- [ ] Thin wrapper: typed columns, data loading, cleanup
- [ ] React adapter
- [ ] Inputs: text, number, date, checkbox, select
- [ ] Row editing: save, cancel, validation, rollback
- [ ] Chained selects
- [ ] Keyboard support, translations, theming
- [ ] First release (0.1.0)

Later: adding and deleting rows, popup editing, bulk editing, server-side mode, Vue and jQuery adapters.

## Development

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
