import { describe, expect, it } from 'vitest';

import { escapeHtml } from '../../src/columns/escape';

describe('escapeHtml', () => {
  it('replaces every character that means something in HTML', () => {
    expect(escapeHtml(`<a href="x" title='y'>Tom & Jerry</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;Tom &amp; Jerry&lt;/a&gt;',
    );
  });

  it('leaves plain text alone', () => {
    expect(escapeHtml('Fès, Rabat ⵜⴰⴷⴰⴱⵓⵜ')).toBe('Fès, Rabat ⵜⴰⴷⴰⴱⵓⵜ');
  });
});
