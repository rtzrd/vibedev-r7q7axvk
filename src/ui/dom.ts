type Kid = Node | string | null;
type Attrs = Record<string, string | number | boolean | null>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  ...kids: Kid[]
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  append(n, kids);
  return n;
}

export function attr<T extends Element>(n: T, a: Attrs): T {
  for (const k in a) {
    const v = a[k];
    if (v !== null && v !== false) n.setAttribute(k, v === true ? '' : `${v}`);
  }
  return n;
}

/** Text arrives as a text node. No markup is ever parsed from user input. */
export function append(parent: Node, kids: readonly Kid[]): void {
  for (const k of kids) {
    if (k !== null) parent.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  }
}

export function empty(parent: Element, kids: readonly Kid[]): void {
  while (parent.firstChild) parent.removeChild(parent.firstChild);
  append(parent, kids);
}

/** Out of sight, still read aloud. */
export const sr = (t: string): HTMLElement => el('span', 'sr', t);
