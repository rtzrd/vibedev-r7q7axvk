/** Element builders. User text always arrives as a text node, never as markup. */

export type Child = Node | string | null;
type Attrs = Record<string, string | number | boolean | null>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  ...kids: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  add(node, kids);
  return node;
}

export function attr<T extends Element>(node: T, attrs: Attrs): T {
  for (const name in attrs) {
    const value = attrs[name];
    if (value === null || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  return node;
}

export function data<T extends HTMLElement>(node: T, entries: Record<string, string>): T {
  for (const name in entries) node.dataset[name] = entries[name];
  return node;
}

export function add(parent: Node, kids: readonly Child[]): void {
  for (const kid of kids) {
    if (kid === null) continue;
    parent.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
}

export function fill(parent: Element, kids: readonly Child[]): void {
  while (parent.firstChild !== null) parent.removeChild(parent.firstChild);
  add(parent, kids);
}

/** Text kept out of sight but left readable by a screen reader. */
export const sr = (text: string): HTMLElement => el('span', 'sr', text);

/** A decorative glyph, hidden from the accessibility tree. */
export const mark = (className: string, glyph: string): HTMLElement =>
  attr(el('span', className, glyph), { 'aria-hidden': 'true' });
