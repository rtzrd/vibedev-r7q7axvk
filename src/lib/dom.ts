/**
 * Tiny element builders.
 *
 * Everything the app puts on screen is built through these, so user text always
 * arrives as a text node: no markup-parsing API is used anywhere in this
 * codebase. Children are positional, which keeps the call sites readable and
 * the shipped bundle small.
 */

export type Child = Node | string | null | undefined;

/** Attribute values; `null` and `false` drop the attribute, `true` sets it bare. */
export type AttrValue = string | number | boolean | null;

/** Create an element with an optional class and any number of children. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  add(node, children);
  return node;
}

/** Set attributes, skipping the ones that are absent. */
export function attr<T extends Element>(node: T, attrs: Record<string, AttrValue>): T {
  for (const name in attrs) {
    const value = attrs[name];
    if (value === null || value === undefined || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  return node;
}

/** Set `data-*` entries used as styling hooks. */
export function data<T extends HTMLElement>(node: T, entries: Record<string, string>): T {
  for (const name in entries) node.dataset[name] = entries[name];
  return node;
}

/** Append children, turning strings into text and skipping empty slots. */
export function add(parent: Node, children: readonly Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined) continue;
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** Replace a node's children in one pass. */
export function fill(parent: Element, children: readonly Child[]): void {
  while (parent.firstChild !== null) parent.removeChild(parent.firstChild);
  add(parent, children);
}

/** Text kept out of sight but left readable by a screen reader. */
export function hidden(text: string): HTMLSpanElement {
  return el('span', 'sr', text);
}

/** A decorative glyph, hidden from the accessibility tree. */
export function glyph(className: string, mark: string): HTMLSpanElement {
  return attr(el('span', className, mark), { 'aria-hidden': 'true' });
}
