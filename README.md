# ⵜⴰⴷⴰⴱⵓⵜ · Tadabut

[![CI](https://github.com/ayem1412/tadabut/actions/workflows/ci.yml/badge.svg)](https://github.com/ayem1412/tadabut/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![DataTables 3](https://img.shields.io/badge/DataTables-3.x-0d6efd)](https://datatables.net)
[![Status](https://img.shields.io/badge/status-stable-brightgreen)](https://ayem1412.github.io/tadabut/roadmap/)
[![npm](https://img.shields.io/npm/v/tadabut)](https://www.npmjs.com/package/tadabut)
[![Docs](https://img.shields.io/badge/docs-website-blue)](https://ayem1412.github.io/tadabut/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

Tadabut wraps [DataTables](https://datatables.net) and adds what it doesn't give you for free: editing rows, real inputs in the cells, and selects that depend on each other.

📖 [The website](https://ayem1412.github.io/tadabut/) has a live demo, a guide for every feature, and the [API reference](https://ayem1412.github.io/tadabut/api/) for every option and type.

## Why

DataTables is great for showing data. Editing that data inside the table is a different story: you either buy the Editor extension or write a lot of code yourself. Tadabut is that code, written once.

- Edit a row in place, then save or cancel. Saving can be async. If it fails, the row stays open with what the user typed, so nothing is lost.
- Add a row from your own button: it opens at the top of the table, with the same inputs and validation.
- Delete a row, with a question first, or your own popup.
- Text, number, money, date, checkbox and select inputs, with validation.
- Selects that depend on another field, like country and city. Old requests get cancelled when the user changes their mind.
- Detail rows that open under a row, loaded from your server if you like, with JSX in React.
- Fully typed. The table knows what your rows look like, so a typo in a column name is a type error.
- No jQuery. It's built on DataTables 3, which doesn't need it anymore.

## Framework support

The core has no framework in it. Each framework gets a small adapter on top.

| Target     | Status    |
| ---------- | --------- |
| TypeScript | Supported |
| JavaScript | Supported |
| React      | Supported |
| Vue        | Supported |
| jQuery     | Planned   |

## Requirements

- DataTables 3: `datatables.net`, or one of its styling packages like `datatables.net-dt`
- React 19 and `react-dom`, only if you use the React adapter
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

For the React adapter, you also need React 19 and `react-dom`, which your app most likely has already.

Then import DataTables and its CSS once, before you create a table:

```ts
import 'datatables.net-dt';
import 'datatables.net-dt/css';
```

Tadabut works with any DataTables 3 styling package: `datatables.net-bs5` for Bootstrap 5, and so on.

## Quick start

Give Tadabut the type of your rows. Every column's `prop` is checked against it.

The guides below all use this `Employee` type.

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

## Guides

Everything is also on [the website](https://ayem1412.github.io/tadabut/), with search and a live demo.

- [Columns and cells](https://ayem1412.github.io/tadabut/columns/): What cells show, totals, and every column option.
- [Editing](https://ayem1412.github.io/tadabut/editing/): The editors, validation, chained selects, and saving, adding and deleting rows.
- [Rows](https://ayem1412.github.io/tadabut/rows/): Selecting rows, the current row, detail rows, and working with rows from code.
- [Events](https://ayem1412.github.io/tadabut/events/): Knowing when something happened: the `on…` options and `table.on()`.
- [Styling and texts](https://ayem1412.github.io/tadabut/styling/): DataTables settings, translations, classes, Bootstrap and icons.
- [Sharing settings between tables](https://ayem1412.github.io/tadabut/shared-defaults/): Write the common options once, with `Tadabut.extend` or `<TadabutDefaults>`.
- [React](https://ayem1412.github.io/tadabut/react/): The `<Tadabut>` component from `tadabut/react`.
- [Vue](https://ayem1412.github.io/tadabut/vue/): The `<Tadabut>` component from `tadabut/vue`.
- [Roadmap](https://ayem1412.github.io/tadabut/roadmap/): What's done, and what comes next.

## Contributing

Help is welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) to get set up, and please follow the [code of conduct](./CODE_OF_CONDUCT.md).

## Not affiliated with DataTables

Tadabut is an independent project. It isn't made by SpryMedia or the DataTables team, and it doesn't contain any code from DataTables Editor.

## License

[MIT](./LICENSE) © Anas Youssef ELMAHDAD
