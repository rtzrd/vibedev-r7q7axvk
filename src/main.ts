import './styles/app.css';
import { createLedger } from './state/store';
import { mountApp } from './ui/app';
import { attr, el, empty } from './ui/dom';

const root = document.getElementById('app');
if (root) {
  try {
    mountApp(root, createLedger());
  } catch (e) {
    empty(root, [
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
