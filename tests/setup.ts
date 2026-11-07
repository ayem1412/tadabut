import { afterEach } from 'vitest';

// Every test starts with an empty page. A test file's own afterEach (like
// unmounting React) runs before this one.
afterEach(() => {
  document.body.innerHTML = '';
});
