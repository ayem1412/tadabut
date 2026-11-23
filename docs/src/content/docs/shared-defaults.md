---
title: 'Sharing settings between tables'
description: 'Write the common options once, with Tadabut.extend or <TadabutDefaults>.'
---

Write the common options once, with `Tadabut.extend` or `<TadabutDefaults>`.

The examples use the `Employee` type from the [quick start](getting-started.mdx#quick-start).

Most tables in an app repeat the same lines: the texts, the DataTables language, the classes, the icons. Write them once with `Tadabut.extend`, like `axios.create`:

```ts
// tables.ts
import { fr, Tadabut } from 'tadabut';

export const AppTable = Tadabut.extend({
  texts: fr,
  dataTables: { language: french, pageLength: 25 },
  classNames: { table: 'table table-striped', button: 'btn btn-sm', edit: 'btn-outline-primary' },
  icons: { edit: 'fa-solid fa-pen', delete: 'fa-solid fa-trash' },
});
```

```ts
// any page
import { AppTable } from './tables';

const table = new AppTable(container, { data, columns, rowId: 'id', onSave });
```

`AppTable` is a real Tadabut: same methods, same types. Pages that use `Tadabut` itself don't change.

**A page's own options win:**

- `texts`, `classNames`, `icons`, `editing` and `dataTables` combine key by key. So `texts: { save: 'Valider' }` changes only Save, and keeps the rest of `fr`.
- `dataTables.language` combines key by key too, when both are objects. A page's `language: { url }` replaces it.
- Everything else is replaced: `selection: false` on a page turns off the defaults' `selection: true`.
- An option a page passes as `undefined` doesn't count, so it keeps the default.

**What can be a default:** `texts`, `classNames`, `icons`, `dataTables`, `editing`, `editable`, `totalRows`, `selection`, `currentRow`, and `confirmDelete: false`. Not `data`, `columns`, `rowId`, `detail` or the callbacks: they depend on the page's rows.

**Building on it:** `AppTable.extend({ editable: false })` gives a class with `AppTable`'s defaults, plus its own. `AppTable` doesn't change.

**The defaults never change after `extend`.** `AppTable.defaults` shows them, and it's frozen. For different defaults, make another class.

In React, wrap your app in `<TadabutDefaults>`. Every `<Tadabut>` inside gets those defaults, with the same rules:

```tsx
import { TadabutDefaults } from 'tadabut/react';

const appDefaults = { texts: fr, classNames: bootstrapClasses }; // outside the component

<TadabutDefaults value={appDefaults}>
  <App />
</TadabutDefaults>;
```

Keep `value` the same object, as a constant or in a `useMemo`: a new object rebuilds every table inside. An inner `<TadabutDefaults>` builds on the outer one.
