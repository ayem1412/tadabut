import 'datatables.net-dt';
import 'datatables.net-dt/css';
import '../shared/tadabut.css';
import '../shared/plain.css';

import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Tadabut, type TadabutHandle } from '../../src/react/index';
import { columns, fakeAdd, fakeDelete, fakeSave, type Row, rows, settings } from '../shared/data';

function App() {
  const [data, setData] = useState(rows);
  const [status, setStatus] = useState('');
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
        <span className='status'>{status}</span>
      </div>

      <Tadabut
        ref={tableRef}
        data={data}
        columns={columns}
        rowId='id'
        dataTables={settings}
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

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
