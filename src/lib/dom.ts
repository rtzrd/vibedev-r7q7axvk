// Element builders. User text always arrives as a text node, never as markup.

type Child = Node | string | null;
type Attrs = Record<string, string | number | boolean | null>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  ...kids: Child[]
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  add(n, kids);
  return n;
}

export function attr<T extends Element>(n: T, a: Attrs): T {
  for (const k in a) {
    const v = a[k];
    if (v === null || v === false) continue;
    n.setAttribute(k, v === true ? '' : `${v}`);
  }
  return n;
}

export function data<T extends HTMLElement>(n: T, d: Record<string, string>): T {
  for (const k in d) n.dataset[k] = d[k];
  return n;
}

export function add(parent: Node, kids: readonly Child[]): void {
  for (const k of kids) {
    if (k === null) continue;
    parent.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  }
}

export function fill(parent: Element, kids: readonly Child[]): void {
  while (parent.firstChild) parent.removeChild(parent.firstChild);
  add(parent, kids);
}

/** Text kept out of sight but left readable by a screen reader. */
export const sr = (t: string): HTMLElement => el('span', 'sr', t);
/** A decorative glyph, hidden from the accessibility tree. */
export const mark = (cls: string, g: string): HTMLElement =>
  attr(el('span', cls, g), { 'aria-hidden': 'true' });
