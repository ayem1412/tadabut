import 'datatables.net-dt';
import 'datatables.net-dt/css';
import '../shared/tadabut.css';

import { type Column, type ServerFunction, Tadabut } from '../../src/index';

/** The fields we ask DummyJSON for. It always adds `id`. */
type User = {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  gender: string;
};

/** What DummyJSON's lists answer. */
type UserList = { users: User[]; total: number; skip: number; limit: number };

const api = 'https://dummyjson.com/users';
const fields = 'firstName,lastName,age,email,gender';

const genderSelect = document.querySelector('#gender') as HTMLSelectElement;
const statusEl = document.querySelector('#status') as HTMLElement;
const logEl = document.querySelector('#log') as HTMLElement;

/** Set by "Fail the next load". */
let failNext = false;

/** Adds a line at the top of the event log. */
function log(text: string): void {
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString()} ${text}`;
  logEl.prepend(item);
}

/** Sends JSON to DummyJSON and reads its answer. Throws with its message when it says no. */
async function send<Answer>(url: string, method: string, body?: unknown): Promise<Answer> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message ?? `DummyJSON answered ${res.status}.`);
  }

  return json as Answer;
}

/** Turns Tadabut's request into DummyJSON's query, and its answer into Tadabut's. */
const server: ServerFunction<User> = async ({ start, length, order, search }, { signal }) => {
  if (failNext) {
    failNext = false;
    throw new Error('Failed on purpose. Change page to load again.');
  }

  const params = new URLSearchParams({
    // DummyJSON's "all" is 0; DataTables' is -1.
    limit: String(Math.max(length, 0)),
    skip: String(start),
    select: fields,
  });

  const [sort] = order;

  if (sort !== undefined) {
    params.set('sortBy', sort.prop);
    params.set('order', sort.dir);
  }

  let url = `${api}?${params}`;

  if (genderSelect.value !== '') {
    params.set('key', 'gender');
    params.set('value', genderSelect.value);
    url = `${api}/filter?${params}`;
  } else if (search !== '') {
    params.set('q', search);
    url = `${api}/search?${params}`;
  }

  log(`GET ${url.replace('https://dummyjson.com', '')}`);

  const res = await fetch(url, { signal });
  const list = (await res.json()) as UserList;

  return { rows: list.users, count: list.total, countAll: 208 };
};

const columns: Column<User>[] = [
  { title: 'First name', prop: 'firstName', editor: { type: 'text', required: true } },
  { title: 'Last name', prop: 'lastName', editor: { type: 'text', required: true } },
  {
    title: 'Age',
    prop: 'age',
    editor: { type: 'number', min: 18, max: 99, step: 1 },
    total: 'sum',
  },
  { title: 'Email', prop: 'email', editor: { type: 'text' } },
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

const table = new Tadabut<User>(document.querySelector('#table') as HTMLElement, {
  server,
  rowId: 'id',
  columns,
  selection: true,
  totalRows: 'selected',
  currentRow: true,
  detail: async (user, { signal }) => {
    const full = await fetch(`${api}/${user.id}`, { signal }).then((res) => res.json());
    const line = document.createElement('div');
    line.textContent = `${full.company.title}, ${full.company.department} at ${full.company.name}. Lives in ${full.address.city}.`;
    return line;
  },
  dataTables: { pageLength: 10, order: [] },
  onSave: async (user) => {
    const { id, ...changes } = user;
    const saved = await send<User>(`${api}/${id}`, 'PUT', changes);
    return { ...user, ...saved };
  },
  onAdd: (user) => send<User>(`${api}/add`, 'POST', user),
  onDelete: async (user) => {
    await send(`${api}/${user.id}`, 'DELETE');
  },
  onSaved: (user) => log(`saved ${user.firstName} ${user.lastName}`),
  onAdded: (user) => log(`added ${user.firstName} (id ${user.id}; DummyJSON won't keep it)`),
  onDeleted: (user) => log(`deleted ${user.firstName} (DummyJSON won't keep it)`),
  onSelect: (users) => {
    statusEl.textContent = `${users.length} ticked, on any page.`;
  },
  onCurrentChange: (user) => log(user === null ? 'no highlight' : `highlighted ${user.firstName}`),
});

document.querySelector('#add')?.addEventListener('click', () => table.add({ gender: 'female' }));
genderSelect.addEventListener('change', () => table.reload());
document.querySelector('#fail')?.addEventListener('click', () => {
  failNext = true;
  log('the next load will fail');
});

// For trying things in the console.
Object.assign(window, { table });
