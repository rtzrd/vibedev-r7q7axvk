import './styles/app.css';
import { mountApp } from './ui/app';
import { attr, el, empty } from './ui/dom';

const root = document.getElementById('app');
if (root) {
  try {
    mountApp(root);
  } catch (e) {
    empty(root, [
      attr(
        el(
          'p',
          'note note--bad',
          `The pantry could not be drawn. ${e instanceof Error ? e.message : ''}`,
        ),
        { role: 'alert' },
      ),
    ]);
  }
}
