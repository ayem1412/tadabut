import 'datatables.net-dt';
import 'datatables.net-dt/css';

import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Tadabut, type TadabutHandle } from '../src/react/index';
import { columns, fakeSave, type Row, rows } from './data';

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
        <span className='status'>{status}</span>
      </div>

      <Tadabut
        ref={tableRef}
        data={data}
        columns={columns}
        rowId='id'
        onSave={async (row) => {
          await fakeSave(row);
          setStatus(`Saved ${row.name}`);
        }}
      />
    </>
  );
}

const root = document.querySelector('#root');

if (!root) {
  throw new Error('Playground: missing #root in react.html');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
