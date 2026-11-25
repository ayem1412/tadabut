<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue';

import type { Column } from '../../src/index';
import { Tadabut, TadabutDefaults } from '../../src/vue/index';

/** The fields asked from DummyJSON. It always adds `id`. */
type User = {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
};

const api = 'https://dummyjson.com/users';

const users = ref<User[]>([]);
const editable = ref(true);
const status = ref('Loading 30 users from DummyJSON…');
const log = ref<string[]>([]);
const table = useTemplateRef('table');

/** Every table inside the `<TadabutDefaults>` gets these. */
const defaults = { classNames: { button: 'btn' } };

const columns: Column<User>[] = [
  { title: 'First name', prop: 'firstName', editor: { type: 'text', required: true } },
  { title: 'Last name', prop: 'lastName', editor: { type: 'text', required: true } },
  { title: 'Age', prop: 'age', editor: { type: 'number', min: 18, step: 1 }, total: 'avg' },
  {
    title: 'Gender',
    prop: 'gender',
    editor: {
      type: 'select',
      options: [
        { value: 'female', label: 'Female' },
        { value: 'male', label: 'Male' },
      ],
    },
  },
];

/** Adds a line at the top of the event log. */
function note(text: string): void {
  log.value.unshift(`${new Date().toLocaleTimeString()} ${text}`);
}

/** The full user, for the detail line. */
async function loadCompany(id: number): Promise<string> {
  const user = await fetch(`${api}/${id}`).then((res) => res.json());
  return `${user.company.title}, ${user.company.department} at ${user.company.name}`;
}

/** A detail line that loads its own data: the slot only gives it the row. */
const companies = ref<Record<number, string>>({});

function onDetail(id: number): string {
  if (companies.value[id] === undefined) {
    companies.value[id] = 'Loading…';
    loadCompany(id).then((text) => {
      companies.value[id] = text;
    });
  }

  return companies.value[id] ?? '';
}

/** DummyJSON answers a save, but doesn't keep it. */
async function onSave(user: User): Promise<User> {
  const { id, ...changes } = user;
  await fetch(`${api}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  return user;
}

/** Pushes a made-up user: the table sees it, without a new array. */
function pushOne(): void {
  const id = 1000 + users.value.length;
  users.value.push({ id, firstName: 'New', lastName: `User ${id}`, age: 30, gender: 'female' });
  note(`pushed user ${id}`);
}

onMounted(async () => {
  const res = await fetch(`${api}?limit=30&select=firstName,lastName,age,gender`);
  users.value = (await res.json()).users;
  status.value = `${users.value.length} users.`;
});
</script>

<template>
  <h1>Tadabut · Vue</h1>

  <p>
    30 users from <a href="https://dummyjson.com/docs/users">DummyJSON</a>, given as
    <code>data</code>. Saves go to DummyJSON, which answers but doesn't keep them.
  </p>

  <div class="toolbar">
    <button type="button" @click="pushOne">Push a user</button>
    <button type="button" @click="table?.edit(users[0]?.id ?? 0)">Edit the first one</button>
    <button type="button" @click="note(`${table?.getSelected().length ?? 0} ticked`)">
      How many ticked?
    </button>
    <label><input v-model="editable" type="checkbox" /> Editable</label>
    <span class="status">{{ status }}</span>
  </div>

  <TadabutDefaults :value="defaults">
    <Tadabut
      ref="table"
      :data="users"
      :columns="columns"
      row-id="id"
      :editable="editable"
      selection
      current-row
      :on-save="onSave"
      :on-delete="() => {}"
      @saved="(user) => note(`saved ${user.firstName}`)"
      @deleted="(user) => note(`deleted ${user.firstName}`)"
      @select="(rows) => note(`${rows.length} ticked`)"
      @current-change="(user) => note(user ? `highlighted ${user.firstName}` : 'no highlight')"
    >
      <template #detail="{ row }">
        <em>{{ onDetail(row.id) }}</em>
      </template>
    </Tadabut>
  </TadabutDefaults>

  <h2>Events</h2>
  <ol class="status">
    <li v-for="line in log" :key="line">{{ line }}</li>
  </ol>
</template>
