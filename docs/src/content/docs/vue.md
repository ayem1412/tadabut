---
title: 'Vue'
description: 'The <Tadabut> component from tadabut/vue.'
---

The `<Tadabut>` component from `tadabut/vue`, for Vue 3.5 and later.

The examples use the `Employee` type from the [quick start](getting-started.mdx#quick-start).

The same options, as props. Callbacks that give something back stay props, and "something happened" callbacks become events. A whole file you can copy:

```vue
<script setup lang="ts">
import 'datatables.net-dt';
import 'datatables.net-dt/css';

import { ref, useTemplateRef } from 'vue';
import type { Column } from 'tadabut';
import { Tadabut } from 'tadabut/vue';

type Employee = { id: number; name: string; countryId: number | null };

// Outside any reactive state: a new array rebuilds the table.
const columns: Column<Employee>[] = [
  { prop: 'id', title: 'ID' },
  { prop: 'name', title: 'Name', editor: { type: 'text', required: true } },
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

const employees = ref<Employee[]>([
  { id: 1, name: 'Amina', countryId: 1 },
  { id: 2, name: 'Lucas', countryId: 2 },
]);
const table = useTemplateRef('table');

async function saveEmployee(row: Employee): Promise<void> {
  const res = await fetch(`/api/employees/${row.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    throw new Error('Save failed');
  }
}
</script>

<template>
  <button type="button" @click="table?.add()">Add</button>

  <Tadabut
    ref="table"
    :data="employees"
    :columns="columns"
    row-id="id"
    :on-save="saveEmployee"
    @saved="(row) => console.log('Saved', row.name)"
  />
</template>
```

<div data-demo="vue"></div>

## Props and events

Every option is a prop, written in kebab-case in templates: `row-id`, `total-rows`, `data-tables`… Except these:

| Option             | In Vue                                  |
| ------------------ | --------------------------------------- |
| `onSaved`          | `@saved="(row, { previous }) => …"`     |
| `onAdded`          | `@added="(row) => …"`                   |
| `onDeleted`        | `@deleted="(row) => …"`                 |
| `onSelect`         | `@select="(rows) => …"`                 |
| `onCurrentChange`  | `@current-change="(row) => …"`          |
| `onRowClick`       | `@row-click="(row, event) => …"`        |
| `onRowDoubleClick` | `@row-double-click="(row, event) => …"` |
| `detail`           | the `#detail` slot (see below)          |

They get the same arguments as the options. `onSave`, `onAdd`, `onDelete`, `confirmDelete`, `onEditStart` and `server` stay props, like `:on-save="saveEmployee"`, because an event can't send a value back.

Yes/no props can be written alone: `<Tadabut selection current-row>` turns both on.

Other attributes, like `class`, `id` or `style`, go on the `<div>` around the table.

## When the table rebuilds

Changing `columns`, `row-id`, `data-tables`, `texts`, `total-rows`, `selection`, `current-row` or the values in `auto-add` rebuilds the table: open rows and details close, and the ticks and the highlight are lost. So keep those in constants, outside `ref()`.

These don't rebuild:

- **`data`:** a new array, `push`, `splice` and replacing an item all update the rows in place. Changing a field inside a row (`row.name = 'x'`) isn't seen, so big tables stay fast: use `updateRow` for that.
- **`editable`:** turns editing off and on in place.
- **`editing`, `class-names` and `icons`:** they can be written inline, like `:editing="{ mode: 'multiple' }"`. They're compared by value.
- **The callbacks:** the latest one is always called.

## Methods

Through a template ref, with the same methods as the core table:

```vue
<script setup lang="ts">
const table = useTemplateRef('table');

function editFirst(): void {
  table.value?.edit(1);
}
</script>

<template>
  <Tadabut ref="table" :data="employees" :columns="columns" row-id="id" />
</template>
```

There's no `setData` or `setEditable`: change the `data` and `editable` props instead. Before the table is built, `getApi()` gives `undefined`.

## Detail rows

Use the `#detail` slot. It gets the row, and anything works inside, your own components too:

```vue
<Tadabut :data="orders" :columns="columns" row-id="id">
  <template #detail="{ row }">
    <OrderLines :order-id="row.id" />
  </template>
</Tadabut>
```

`OrderLines` loads its own data, the usual Vue way. The slot is drawn again after the row is saved. Whether there's a `#detail` slot is read once, when the table is built.

## Shared settings

`<TadabutDefaults>` gives its options to every `<Tadabut>` inside, like `Tadabut.extend`. See [Sharing settings between tables](shared-defaults.md):

```vue
<script setup lang="ts">
import { fr } from 'tadabut';
import { TadabutDefaults } from 'tadabut/vue';

const defaults = { texts: fr, classNames: { button: 'btn btn-sm' } };
</script>

<template>
  <TadabutDefaults :value="defaults">
    <RouterView />
  </TadabutDefaults>
</template>
```

A new `value` object rebuilds every table inside, so keep it in a constant.

## Big tables

`server` works as a prop, and `reload()` is on the ref. See [Big tables](server.md):

```vue
<Tadabut ref="table" :server="loadEmployees" :columns="columns" row-id="id" />
```

```ts
watch(year, () => table.value?.reload());
```

## TypeScript

The row type comes from `data`, or from `columns` with `server`, so a wrong field in `row-id`, an event or the `#detail` slot is a type error in your editor (with the Vue extension) and in `vue-tsc`.

With `h()` or JSX, give the row type yourself: `h(Tadabut<Employee>, { data, columns, rowId: 'id' })`.
