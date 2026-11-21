import 'datatables.net-dt';
import 'datatables.net-dt/css';
import '../shared/tadabut.css';
import '../shared/plain.css';

import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Tadabut, TadabutDefaults, type TadabutHandle } from '../../src/react/index';
import {
  columns,
  type Details,
  fakeAdd,
  fakeDelete,
  fakeSave,
  fetchDetails,
  type Row,
  rows,
  settings,
} from '../shared/data';

/** A row's details as JSX. React escapes the text, like everywhere. */
function DetailsList({ details }: { readonly details: Details }) {
  const [shown, setShown] = useState(false);

  return (
    <dl className='tdb-details'>
      <dt>Email</dt>
      <dd>{details.email}</dd>
      <dt>Phone</dt>
      <dd>
        {/* State inside a detail, to show hooks work there. */}
        {shown ? (
          details.phone
        ) : (
          <button type='button' onClick={() => setShown(true)}>
            Show the number
          </button>
        )}
      </dd>
      <dt>Manager</dt>
      <dd>{details.manager}</dd>
    </dl>
  );
}

function App() {
  const [data, setData] = useState(rows);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [editable, setEditable] = useState(true);
  const tableRef = useRef<TadabutHandle<Row>>(null);

  return (
    <>
      <h1>Tadabut · React</h1>

      <div className='toolbar'>
        <button type='button' onClick={() => setData(rows.filter(() => Math.random() > 0.3))}>
          Random data
        </button>
        <button
          type='button'
          onClick={() => {
            const started = tableRef.current?.edit(1) ?? false;
            setStatus(started ? 'Editing row 1' : "Can't edit row 1 right now");
          }}
        >
          Edit row 1 from outside
        </button>
        <button
          type='button'
          onClick={async () => {
            const deleted = (await tableRef.current?.delete(2)) ?? false;
            setStatus(deleted ? 'Deleted row 2' : "Can't delete row 2 right now");
          }}
        >
          Delete row 2 from outside
        </button>
        <button
          type='button'
          onClick={() => {
            const opened = tableRef.current?.add({ country: 'MA' }) ?? false;
            setStatus(opened ? 'Adding a row' : "Can't add a row right now");
          }}
        >
          Add a row
        </button>
        <button type='button' onClick={() => tableRef.current?.select([1, 2])}>
          Select rows 1 and 2
        </button>
        <button type='button' onClick={() => tableRef.current?.clearSelection()}>
          Clear the selection
        </button>
        <label>
          <input
            type='checkbox'
            checked={editable}
            onChange={(event) => setEditable(event.target.checked)}
          />{' '}
          Editing
        </label>
        <span className='status'>{status}</span>
      </div>

      <p className='status'>Selected: {selected.join(', ') || 'none'}</p>

      <Tadabut
        ref={tableRef}
        editable={editable}
        data={data}
        columns={columns}
        rowId='id'
        editing={{ doubleClick: true }}
        onRowClick={(row) => setStatus(`Clicked ${row.name}`)}
        onSaved={(row, { previous }) => setStatus(`Saved ${previous.name} → ${row.name}`)}
        selection
        currentRow
        onCurrentChange={(row) =>
          setStatus(row === null ? 'No current row' : `Current: ${row.name}`)
        }
        detail={async (row, { signal }) => (
          <DetailsList details={await fetchDetails(row, signal)} />
        )}
        onSelect={(rows) => setSelected(rows.map((row) => row.name))}
        // Inline on purpose: this must not rebuild the table.
        onSave={async (row) => {
          await fakeSave(row);
          setStatus(`Saved ${row.name}`);
        }}
        onAdd={async (row) => {
          const saved = await fakeAdd(row);
          // Same as onDelete: keep the state in sync.
          setData((current) => [...current, saved]);
          setStatus(`Added ${saved.name}`);
          return saved;
        }}
        onDelete={async (row) => {
          await fakeDelete(row);
          // Keep the state in sync, or the row comes back on the next data change.
          setData((current) => current.filter((r) => r.id !== row.id));
          setStatus(`Deleted ${row.name}`);
        }}
      />
    </>
  );
}

const root = document.querySelector('#root');

if (!root) {
  throw new Error('Playground: missing #root in react/index.html');
}

// Outside App, so it's the same object on every render and never rebuilds the table.
const appDefaults = { dataTables: settings };

createRoot(root).render(
  <StrictMode>
    {/* Every <Tadabut> inside gets these, like Tadabut.extend without React. */}
    <TadabutDefaults value={appDefaults}>
      <App />
    </TadabutDefaults>
  </StrictMode>,
);
