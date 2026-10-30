# Contributing

Thanks for wanting to help with Tadabut.

The project is still early and the API changes a lot. So if you want to do something bigger than a small fix, open an issue first and tell me what you have in mind. That way you don't spend time on something I can't merge.

## Getting started

You need Node 22.18 or newer, and pnpm.

```sh
git clone https://github.com/ayem1412/tadabut.git
cd tadabut
pnpm install
pnpm dev
```

`pnpm dev` opens the playground. It has two pages, one plain and one with React, and both use the code in `src/` directly. Use them to try your change.

| Command          | What it does                           |
| ---------------- | -------------------------------------- |
| `pnpm dev`       | Opens the playground                   |
| `pnpm test`      | Runs the tests and watches for changes |
| `pnpm typecheck` | Checks the types                       |
| `pnpm lint`      | Checks formatting and lint rules       |
| `pnpm format`    | Fixes formatting and sorts imports     |
| `pnpm build`     | Builds the library into `dist/`        |
| `pnpm check`     | Runs everything once                   |

Run `pnpm check` before you push. CI runs the same thing.

Formatting is done by [Biome](https://biomejs.dev). Set your editor to use it. Please don't add Prettier or ESLint.

## Where things are

```
src/
  index.ts      everything public is exported here
  table/        the Tadabut class and its options
  columns/      the Column type, and how columns are passed to DataTables
  editors/      one file per editor, the editor contract, and createEditor
  validation/   validation rules and the code that checks them
  editing/      editing a row: turning cells into editors and back
  react/        the React adapter
tests/          same folders as src/
playground/     pages to try things by hand
```

Code is grouped by feature. A new feature gets its own folder. If you add one, add it to this list too.

## Rules

These keep the library small and easy to change.

The core:

- The core never imports React, Vue or jQuery. That code goes in an adapter, like `src/react/`.
- Adapters stay small. They create the table, update it, and destroy it. Real logic goes in the core.
- Adapters import from `src/index.ts` only.
- DataTables types don't show up in the public API.

The public API:

- `src/index.ts` is the only place things are exported from.
- Export as little as you can. Every export is something users will depend on.
- Every export has a `/** */` comment. Users see it when they hover.

TypeScript:

- No `any`. Use `unknown` and check the value.
- Try not to use `as`. If you need a lot of them, the types are probably wrong.
- No enums. Use string unions, like `'text' | 'number'`.
- Write the type of everything you export.
- Use `readonly` when nothing should change a value, arrays too.
- Don't change the user's data. Copy arrays before passing them to DataTables.

Editors:

- Every editor takes an `EditorContext` and returns an `EditorInstance`.
- Call `onChange` only when the user changes the value. `setValue` never calls it.
- `destroy` removes everything the editor created.

Styling:

- Tadabut doesn't ship CSS. It adds `tdb-` classes and the user's `className`, nothing else.
- Don't use Tailwind, Bootstrap or any other framework's classes inside the library.

## Tests

Every change needs tests. They run with [Vitest](https://vitest.dev) in jsdom, which is a fake browser.

- Tests go in `tests/`, in the same folder as the code. `src/editors/date.ts` is tested in `tests/editors/date.test.ts`.
- Test the way a user would: type in the input, click the button, then check the result.
- Clean up after each test with `document.body.innerHTML = ''`.
- For type tests, put `// @ts-expect-error` above a line that should not compile. If the types get weaker, that line compiles, and `pnpm check` fails.
- React tests render inside `StrictMode`, and wrap renders in `act(...)`.

One habit that helps a lot: after writing a test, break the code it checks (delete a line, change a value) and make sure the test fails. Then undo it. A test that can't fail doesn't protect anything.

## Branches and commits

We use [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow). `master` always works, and every change goes through a pull request.

Fork the repo, then make a branch from an up-to-date `master`:

```sh
git switch master
git pull
git switch -c feat/my-change
```

Start the branch name with what kind of change it is: `feat/`, `fix/`, `docs/`, `refactor/`, `test/` or `chore/`.

Commit messages and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org). Pull requests are squash-merged, and the PR title becomes the commit on `master`, so the title matters most:

```
feat: add a date editor
fix: show null as empty in the number editor
docs: explain custom editors
feat!: pass options as one object
```

The `!` means the change breaks something for users.

Keep one topic per branch. Once a branch is merged, don't push to it again. Make a new branch from `master` instead.

## Pull requests

The pull request template has a short checklist. In short:

- `pnpm check` passes.
- You tried your change in the playground, if it changes something you can see.
- New code has tests, and you checked they can fail.
- New exports have a `/** */` comment.
- The README is updated if users would notice the change.

Say what you changed and why. Link the issue if there is one. CI has to pass before merging. Pull requests are squash-merged, so your branch turns into one commit on `master`.

## Versions

Tadabut follows [semver](https://semver.org). Before 1.0, `0.x.0` is for new features and breaking changes, and `0.0.x` is for fixes.

Versions are picked from the commits on `master` by [release-please](https://github.com/googleapis/release-please): `feat` gives a new `0.x.0`, `fix` gives a new `0.0.x`. It keeps a release pull request open with the next version and the changelog. Merging it tags the release and publishes it to npm.

Don't change the version or `CHANGELOG.md` in your pull request.

## DataTables Editor

Tadabut has nothing to do with DataTables Editor, the paid extension. Don't copy, translate or closely follow its code, even if you have a license. Build things from how they should work, not from how Editor does it. I can't merge a pull request that contains Editor code.

## Code of conduct

Please be kind. The full rules are in the [code of conduct](./CODE_OF_CONDUCT.md).

## License

Anything you contribute is released under the [MIT license](./LICENSE), like the rest of the project.
