import './styles/tokens.css';
import './styles/app.css';

import { createLedgerStore } from './state/store';
import { mountApp } from './render/renderApp';
import { attr, el, fill } from './lib/dom';

/**
 * Entry point. Anything that goes wrong before or during the first render is
 * written into the page itself — a blank screen is never an acceptable answer.
 */
function start(): void {
  const root = document.getElementById('app');
  if (root === null) return;

  try {
    mountApp(root, createLedgerStore());
  } catch (error) {
    fill(root, [
      attr(
        el(
          'section',
          'panel panel--error panel--fatal',
          el('p', 'panel__eyebrow', 'Blotted'),
          el('h2', 'panel__title', 'The ledger could not be drawn'),
          el(
            'p',
            'panel__body',
            error instanceof Error ? error.message : 'The reason was not recorded.',
          ),
          el(
            'p',
            'panel__body panel__body--quiet',
            'Reloading will try again. Nothing already saved has been touched.',
          ),
        ),
        { role: 'alert' },
      ),
    ]);
  }
}

start();
