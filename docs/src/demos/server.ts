import { type Column, type ServerFunction, Tadabut } from '../../../src/index';
import { type Demo, wait } from './shared';

/** The fields asked from DummyJSON. It always adds `id`. */
type User = {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  email: string;
};

/** What DummyJSON's lists answer. */
type UserList = { users: User[]; total: number };

const api = 'https://dummyjson.com/users';

/** Sends JSON to DummyJSON. Throws with its message when it says no. */
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

/** server.md: 208 users from DummyJSON, one page at a time. */
const demo: Demo = (box) => {
  const server: ServerFunction<User> = async ({ start, length, order, search }, { signal }) => {
    const params = new URLSearchParams({
      // DummyJSON's "all" is 0; DataTables' is -1.
      limit: String(Math.max(length, 0)),
      skip: String(start),
      select: 'firstName,lastName,age,email',
    });
    const [sort] = order;

    if (sort !== undefined) {
      params.set('sortBy', sort.prop);
      params.set('order', sort.dir);
    }

    if (search !== '') {
      params.set('q', search);
    }

    const url = `${api}${search === '' ? '' : '/search'}?${params}`;
    box.status(`Asked for ${url.replace('https://dummyjson.com', '')}`);

    const res = await fetch(url, { signal });
    const list = (await res.json()) as UserList;

    return { rows: list.users, count: list.total, countAll: 208 };
  };

  const columns: Column<User>[] = [
    { title: 'First name', prop: 'firstName', editor: { type: 'text', required: true } },
    { title: 'Last name', prop: 'lastName', editor: { type: 'text', required: true } },
    { title: 'Age', prop: 'age', editor: { type: 'number', min: 18, step: 1 } },
    { title: 'Email', prop: 'email' },
  ];

  const table = new Tadabut<User>(box.table, {
    server,
    rowId: 'id',
    columns,
    dataTables: { pageLength: 5, order: [], lengthMenu: [5, 10, 25] },
    onSave: async (user) => {
      const { id, ...changes } = user;
      return { ...user, ...(await send<User>(`${api}/${id}`, 'PUT', changes)) };
    },
    onAdd: (user) => send<User>(`${api}/add`, 'POST', user),
    onDelete: async (user) => {
      await send(`${api}/${user.id}`, 'DELETE');
      // So the reload that follows is visible.
      await wait(200);
    },
    onSaved: (user) => box.status(`Saved ${user.firstName}. DummyJSON won't keep it.`),
    onAdded: (user) =>
      box.status(`Added ${user.firstName} (id ${user.id}). DummyJSON won't keep it.`),
    onDeleted: (user) => box.status(`Deleted ${user.firstName}. DummyJSON won't keep it.`),
  });

  box.button('Reload', () => table.reload());
  box.hint(
    'Change page, sort or search: each one asks DummyJSON, as the line above shows. It answers saves and deletes but doesn’t keep them, so a reload brings the old rows back.',
  );
};

export default demo;
