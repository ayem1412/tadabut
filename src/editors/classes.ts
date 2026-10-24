/**
 * Adds Tadabut's own classes and the user's `className` to an element.
 *
 * Internal. `className` can hold several classes separated by any spaces,
 * like `'border  rounded'`. Empty pieces are skipped, because
 * `classList.add('')` throws.
 */
export function addClasses(
  element: HTMLElement,
  ownClasses: readonly string[],
  className: string | undefined,
): void {
  const userClasses = className?.split(/\s+/).filter(Boolean) ?? [];
  element.classList.add(...ownClasses, ...userClasses);
}
