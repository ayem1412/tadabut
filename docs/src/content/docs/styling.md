---
title: 'Styling and texts'
description: 'DataTables settings, translations, classes, Bootstrap and icons.'
---

DataTables settings, translations, classes, Bootstrap and icons.

The examples use the `Employee` type from the [quick start](getting-started.mdx#quick-start).

## DataTables settings

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
      // Keeps the « ‹ › » buttons, and only translates what screen readers say.
      aria: {
        paginate: {
          first: 'Première page',
          previous: 'Page précédente',
          next: 'Page suivante',
          last: 'Dernière page',
        },
      },
    },
  },
});
```

Columns are counted from 0, in the order of your `columns`. The Edit button column always comes last, so it never moves your columns.

Five settings aren't allowed, because Tadabut controls them:

- `data` and `columns`: Tadabut makes them from its own `data` and `columns`.
- `columnDefs`: use the [column options](columns.md#column-options) instead.
- `ajax` and `serverSide`: DataTables would load and replace rows behind Tadabut's back. Load the rows yourself and call `setData`.

These are type errors, and Tadabut's own values win even in plain JavaScript.

`language` only changes DataTables' texts. For Tadabut's own texts, see [Texts and translations](#texts-and-translations).

In React, keep `dataTables` outside your component or in a `useMemo`, like `columns`. A new object on every render rebuilds the table.

## Texts and translations

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

| Key                           | English                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `edit`, `save`, `cancel`      | Edit, Save, Cancel                                                                |
| `delete`                      | Delete                                                                            |
| `deleteQuestion`              | Delete this row?                                                                  |
| `confirm`, `keep`             | Yes, delete / No                                                                  |
| `loading`                     | Loading…                                                                          |
| `saveFailed`                  | Could not save.                                                                   |
| `addFailed`                   | Could not add.                                                                    |
| `deleteFailed`                | Could not delete.                                                                 |
| `total`                       | Total                                                                             |
| `selectRow`, `selectAll`      | Select row / Select all (the checkboxes' labels, for screen readers)              |
| `showDetail`, `hideDetail`    | Show details / Hide details (the ▸ button's label, for screen readers)            |
| `detailLoading`               | Loading… (while a detail loads)                                                   |
| `detailFailed`                | Couldn't load the details. (when `detail` throws something that isn't an `Error`) |
| `loadFailed`                  | Could not load the options.                                                       |
| `required`                    | This field is required.                                                           |
| `patternMismatch`             | Wrong format.                                                                     |
| `tooShort`, `tooLong`         | Must be at least 2 characters.                                                    |
| `tooSmall`, `tooLarge`        | Must be 18 or more.                                                               |
| `tooEarly`, `tooLate`         | Must be on or after 2020-01-01.                                                   |
| `timeTooEarly`, `timeTooLate` | Must be at or after 08:00.                                                        |

The messages with a number or a date are functions, so you can put the value where your language needs it:

```ts
texts: {
  tooSmall: (min) => `Mindestens ${min}.`;
}
```

`saveFailed`, `addFailed` and `deleteFailed` only show when `onSave`, `onAdd` or `onDelete` throws something that isn't an `Error`. When it throws an `Error`, its own message is shown.

DataTables' own texts (search, paging, "Showing 1 to 10") are set separately, with `dataTables.language`. See [DataTables settings](#datatables-settings).

In React, `texts={fr}` is fine. A new object on every render (like `texts={{ ...fr, save: 'Valider' }}` written inline) rebuilds the table each time, so put it in a constant or a `useMemo`.

## Styling

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
| `tdb-detail`            | the ▸ column, header too                                    |
| `tdb-detail-toggle`     | the ▸ / ▾ button                                            |
| `tdb-detail-open`       | a row whose detail is open                                  |
| `tdb-row-detail`        | the line under a row with its detail                        |

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
| `detail`         | the ▸ button                  |
| `current`        | the highlighted row           |

All of them are optional. Tadabut doesn't know any CSS framework: it adds the classes you give it, and nothing else. If you use Tailwind: it only keeps classes it finds in your own files. Classes in your column config count, so they work.

DataTables' own parts (the search box, the page size, the paging buttons) are styled by the DataTables package you install: `datatables.net-dt` for the default look, `datatables.net-bs5` for Bootstrap 5, and so on.

### With Bootstrap 5

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
    current: 'table-active',
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

### Icons instead of text: `icons`

Give each button the classes of an icon, from any icon font: FontAwesome, Bootstrap Icons, and others. Load the icon font's CSS yourself.

```ts
const table = new Tadabut(container, {
  data: employees,
  rowId: 'id',
  columns,
  icons: {
    edit: 'fa-solid fa-pen',
    delete: 'fa-solid fa-trash',
    save: 'fa-solid fa-check',
    cancel: 'fa-solid fa-xmark',
    confirm: 'fa-solid fa-check', // "Yes, delete"
    keep: 'fa-solid fa-rotate-left', // "No"
    showDetail: 'fa-solid fa-plus', // instead of ▸
    hideDetail: 'fa-solid fa-minus', // instead of ▾
  },
});
```

- The button shows only the icon: `<i class="fa-solid fa-pen" aria-hidden="true"></i>`. Its text (`texts.edit`, so "Modifier" with `fr`) goes to `aria-label` for screen readers, and `title` for the tooltip on hover.
- A button you leave out keeps its text, and the ▸ button keeps its arrows.
- The keys are the same as in `texts`, so `icons.edit` goes with `texts.edit`.
- Only class names, never HTML: Tadabut builds the `<i>` itself, so there's nothing in it that could run.

With FontAwesome 4, use `'fa fa-pencil'`. With Bootstrap Icons, `'bi bi-pencil'`.

To make them look like plain clickable icons instead of buttons, with Bootstrap 5:

```ts
classNames: {
  button: 'btn btn-sm btn-link px-1',
  edit: 'text-primary',
  save: 'text-success',
  cancel: 'text-secondary',
  delete: 'text-danger',
  confirm: 'text-danger',
  keep: 'text-secondary',
},
```

Without Bootstrap, leave `classNames.button` out, and remove the button look in your CSS:

```css
.tdb-button {
  border: 0;
  background: none;
  cursor: pointer;
  padding: 0.125rem 0.25rem;
}
```

In React, `icons={{ edit: 'fa-solid fa-pen' }}` inline is fine: only new icons rebuild the table.
