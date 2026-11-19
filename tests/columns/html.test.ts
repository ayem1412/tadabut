import { describe, expect, it } from 'vitest';

import { html } from '../../src/index';

describe('html', () => {
  it('keeps the HTML you wrote, and escapes the values', () => {
    const node = html`<span class="badge">${'<b>hi</b>'}</span>` as HTMLElement;

    expect(node.outerHTML).toBe('<span class="badge">&lt;b&gt;hi&lt;/b&gt;</span>');
  });

  it("doesn't let a value add an attribute inside quotes", () => {
    const node = html`<span class="bg-${'x" onclick="alert(1)'}">A</span>` as HTMLElement;

    expect(node.getAttribute('onclick')).toBeNull();
    expect(node.className).toBe('bg-x" onclick="alert(1)');
  });

  it('gives the element when there is one, and a fragment for many', () => {
    expect(html`  <i>A</i>  `).toBeInstanceOf(HTMLElement);

    const many = html`<i>A</i> <b>B</b>`;

    expect(many).toBeInstanceOf(DocumentFragment);
    expect(many.textContent).toBe('A B');
  });

  it('shows null and undefined as nothing, and other values as text', () => {
    expect(html`<i>${null}${undefined}${0}${false}</i>`.textContent).toBe('0false');
  });

  it("doesn't run what it builds", () => {
    const node = html`<img src="x" onerror="window.ranIt = true">`;

    expect((window as { ranIt?: boolean }).ranIt).toBeUndefined();
    expect(node).toBeInstanceOf(HTMLImageElement);
  });
});
