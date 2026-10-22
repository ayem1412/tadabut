import 'datatables.net-dt';
import 'datatables.net-dt/css';

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Tadabut } from '../src/react/index';
import { columns, rows } from './data';

function App() {
  const [data, setData] = useState(rows);

  return (
    <>
      <h1>Tadabut · React</h1>

      <div className='toolbar'>
        <button type='button' onClick={() => setData(rows.filter(() => Math.random() > 0.3))}>
          Random data
        </button>
      </div>

      <Tadabut data={data} columns={columns} rowId='id' />
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
