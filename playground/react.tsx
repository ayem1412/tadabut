import 'datatables.net-dt';
import 'datatables.net-dt/css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Tadabut } from '../src/react/index';
import { columns, rows } from './data';

function App() {
  return (
    <>
      <h1>Tadabut · React</h1>
      <Tadabut data={rows} columns={columns} />
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
