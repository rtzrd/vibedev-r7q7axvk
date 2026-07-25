import './styles/tokens.css';
import './styles/app.css';
import { createLedger } from './state/store';
import { mountApp } from './render/renderApp';
import { attr, el, fill } from './lib/dom';

/** Anything that fails before the first render is written into the page. */
const root = document.getElementById('app');
if (root) {
  try {
    mountApp(root, createLedger());
  } catch (e) {
    fill(root, [
      attr(
        el(
          'section',
          'panel panel--error',
          el('h2', 'panel__t', 'The ledger could not be drawn'),
          el('p', 'body', e instanceof Error ? e.message : 'No reason was recorded.'),
        ),
        { role: 'alert' },
      ),
    ]);
  }
}
