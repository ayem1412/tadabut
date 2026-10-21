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

Coming soon. The API is still being designed.

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

## Not affiliated with DataTables

Tadabut is an independent project. It is not made by or affiliated with SpryMedia or the DataTables project. It does not use or include code from DataTables Editor.

## License

[MIT](./LICENSE) © Anas Youssef ELMAHDAD
