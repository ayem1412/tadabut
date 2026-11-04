/**
 * `'btn  btn-sm '` → `['btn', 'btn-sm']`. Empty pieces are dropped because
 * `classList.add('')` throws.
 */
export function splitClasses(...lists: (string | undefined)[]): string[] {
  return lists.flatMap((list) => list?.split(/\s+/).filter(Boolean) ?? []);
}

/** Adds Tadabut's own classes, then the user's. */
export function addClasses(
  element: HTMLElement,
  ownClasses: readonly string[],
  className: string | undefined,
): void {
  element.classList.add(...ownClasses, ...splitClasses(className));
}
