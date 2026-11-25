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

`pnpm dev` opens the playground. It has two pages, Bootstrap and React, and both use the code in `src/` directly. The Bootstrap page has a switch for every option and logs every event. Use them to try your change.

```
playground/
  index.html      links to the two pages
  shared/         used by every page
    data.ts       the rows, and the columns (makeColumns)
    tadabut.css   the CSS every page needs
    plain.css     the look of the React page
  bootstrap/      index.html, bootstrap.ts, bootstrap.css
  react/          index.html, react.tsx
```

Both pages share the same rows and columns, from `makeColumns()` in `shared/data.ts`, so a new column is added once. The Bootstrap page passes its input classes to it.

| Command          | What it does                           |
| ---------------- | -------------------------------------- |
| `pnpm dev`       | Opens the playground                   |
| `pnpm test`      | Runs the tests and watches for changes |
| `pnpm typecheck` | Checks the types                       |
| `pnpm lint`      | Checks formatting and lint rules       |
| `pnpm format`    | Fixes formatting and sorts imports     |
| `pnpm build`     | Builds the library into `dist/`        |
| `pnpm docs:dev`  | Opens the website, and reloads on save |
| `pnpm run docs`  | Builds the website into `docs/dist/`   |
| `pnpm check`     | Runs everything once                   |

Run `pnpm check` before you push. CI runs the same thing.

The website is made with [Starlight](https://starlight.astro.build) and the [Ion theme](https://louisescher.github.io/starlight-ion-theme/). The guides are in `docs/src/content/docs/`. The API pages come from the code's `/** */` comments: `pnpm docs:api` turns them into Markdown in `docs/src/content/docs/api/`, which isn't committed. `pnpm docs:dev` and `pnpm run docs` run it first.

Link guides to each other with their file name, like `[Editing](editing.md#dates)`, so the links work on GitHub too. The website turns them into its own links.

`pnpm run docs` needs `run`: `pnpm docs` alone is a pnpm command that opens a package's website. TypeDoc runs with TypeScript 6 on purpose, because it can't read TypeScript 7 yet. It downloads by itself the first time, so there's nothing to install.

A live demo goes under an example with `<div data-demo="name"></div>`, for the file `docs/src/demos/name.ts`. It's a plain div, so GitHub shows nothing. If you change an example, change its demo too.

The guides are formatted by [Prettier](https://prettier.io) instead of Biome: Biome flattens the settings block at the top of each one, which Starlight needs. `pnpm format` runs both. In `.mdx` files, put a blank line around a code block inside a component like `<TabItem>`, and don't indent it, or Prettier squashes it onto one line.

Everything else is formatted and linted by [Biome](https://biomejs.dev). Set your editor to use it. Please don't add ESLint, or Prettier for anything but the guides.

## Where things are

```
src/
  index.ts      everything public is exported here
  table/        the Tadabut class, its options, the new row, and the buttons it adds
  columns/      the Column type, and how columns are passed to DataTables
  editors/      one file per editor, the editor contract, and createEditor
  validation/   validation rules and the code that checks them
  texts/        Tadabut's own texts: the `Texts` type, English and French
  editing/      editing a row: turning cells into editors and back
  react/        the React adapter
tests/          same folders as src/
playground/     pages to try things by hand, one folder each
docs/           the website
  src/content/docs/  the guides, one file each
  src/demos/         the live demos, one file each
  src/components/    what puts the demos in the pages
  src/icons/         the sidebar icons, from Lucide (ISC license)
typedoc.json    settings for the API pages
```

Code is grouped by feature. A new feature gets its own folder. If you add one, add it to this list too.

## Rules

These keep the library small and easy to change.

The core:

- The core never imports React, Vue or jQuery. That code goes in an adapter, like `src/react/`.
- Adapters stay small. They create the table, update it, and destroy it. Real logic goes in the core.
- Adapters import from `src/index.ts` only.
- DataTables types don't show up in the public API, except `DataTablesSettings`: the escape hatch for DataTables' own settings. Anything Tadabut controls (like `data` and `columns`) is taken out of it with `Omit`.

The public API:

- `src/index.ts` is the only place things are exported from.
- Export as little as you can. Every export is something users will depend on.
- Every export has a `/** */` comment. Users see it when they hover, and `pnpm run docs` turns these comments into the [API reference](https://ayem1412.github.io/tadabut/). Write them for someone who has never seen the code.

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

Texts:

- Don't hard-code text users can see. Add a key to `Texts` in `src/texts/texts.ts`, then to every language in `src/texts/`. TypeScript tells you if one is missing.

Styling:

- Tadabut doesn't ship CSS. It adds `tdb-` classes and the user's `className`, nothing else.
- Don't use Tailwind, Bootstrap or any other framework's classes inside the library.

## Tests

Every change needs tests. They run with [Vitest](https://vitest.dev) in jsdom, which is a fake browser.

- Tests go in `tests/`, in the same folder as the code. `src/editors/date.ts` is tested in `tests/editors/date.test.ts`.
- Test the way a user would: type in the input, click the button, then check the result.
- The page is emptied after every test by `tests/setup.ts`, so you don't need your own cleanup.
- `tests/helpers.ts` has the small pieces most tests need: `mountPoint()` for a container, `type()`, `search()`, `goToPage()`, `settle()`, and `waiting()` for a callback that waits until the test says so. Use them instead of writing your own.
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
- The guide in `docs/src/content/docs/` is updated if users would notice the change. The README only changes for installation, the quick start, or a new guide.

Say what you changed and why. Link the issue if there is one. CI has to pass before merging. Pull requests are squash-merged, so your branch turns into one commit on `master`.

## Versions

Tadabut follows [semver](https://semver.org). Before 1.0, `0.x.0` is for new features and breaking changes, and `0.0.x` is for fixes.

Versions are picked from the commits on `master` by [release-please](https://github.com/googleapis/release-please): `feat` gives a new `0.x.0`, `fix` gives a new `0.0.x`. It keeps a release pull request open with the next version and the changelog. Merging it tags the release and sends it to npm, where it waits until a maintainer approves it.

Don't change the version or `CHANGELOG.md` in your pull request.

## DataTables Editor

Tadabut has nothing to do with DataTables Editor, the paid extension. Don't copy, translate or closely follow its code, even if you have a license. Build things from how they should work, not from how Editor does it. I can't merge a pull request that contains Editor code.

## Code of conduct

Please be kind. The full rules are in the [code of conduct](./CODE_OF_CONDUCT.md).

## License

Anything you contribute is released under the [MIT license](./LICENSE), like the rest of the project.
