import { type Mock, vi } from 'vitest';

/** An empty `<div>` in the page, for a table. tests/setup.ts removes it after the test. */
export function mountPoint(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);

  return container;
}

/** Sets an input's text and fires `input`, like typing would. `caret` puts the cursor somewhere. */
export function type(input: HTMLInputElement, text: string, caret?: number): void {
  input.value = text;

  if (caret !== undefined) {
    input.setSelectionRange(caret, caret);
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Types in DataTables' search box. */
export function search(root: ParentNode, text: string): void {
  type(root.querySelector<HTMLInputElement>('.dt-search input') as HTMLInputElement, text);
}

/** Clicks a page number in DataTables' paging, `0` being the first page. */
export function goToPage(root: ParentNode, index: number): void {
  root.querySelector<HTMLElement>(`.dt-paging [data-dt-idx="${index}"]`)?.click();
}

/** Lets the promises started by a click or a key finish. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

/**
 * A callback, like `onSave`, that waits until the test says so. `resolve` and
 * `reject` settle its latest call.
 */
export function waiting<Value>(): {
  readonly fn: Mock<() => Promise<Value>>;
  readonly resolve: (value: Value) => void;
  readonly reject: (error: unknown) => void;
} {
  let resolve: (value: Value) => void = () => {};
  let reject: (error: unknown) => void = () => {};

  const fn = vi.fn(
    () =>
      new Promise<Value>((res, rej) => {
        resolve = res;
        reject = rej;
      }),
  );

  return {
    fn,
    resolve: (value) => resolve(value),
    reject: (error) => reject(error),
  };
}
