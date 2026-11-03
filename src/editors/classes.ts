/**
 * Turns class lists like `'btn  btn-sm '` into single classes, like
 * `['btn', 'btn-sm']`.
 *
 * Internal. Each list can hold several classes separated by any spaces.
 * `undefined` lists and empty pieces are skipped, because
 * `classList.add('')` throws.
 *
 * @param lists The class lists, in order. `undefined` is allowed, so
 *   optional options can be passed as they are.
 */
export function splitClasses(...lists: (string | undefined)[]): string[] {
  return lists.flatMap((list) => list?.split(/\s+/).filter(Boolean) ?? []);
}

/**
 * Adds Tadabut's own classes and the user's `className` to an element.
 *
 * Internal. `className` can hold several classes separated by any spaces,
 * like `'border  rounded'`.
 */
export function addClasses(
  element: HTMLElement,
  ownClasses: readonly string[],
  className: string | undefined,
): void {
  element.classList.add(...ownClasses, ...splitClasses(className));
}
