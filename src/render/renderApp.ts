import type { AppState, Summary, View } from '../types';
import type { Store } from '../state/store';
import { longDate } from '../lib/dates';
import { attr, el, fill, mark } from '../lib/dom';
import { HabitCard } from '../components/HabitCard';
import { HabitForm, type FormHandle } from '../components/HabitForm';
import { Empty, Failed, Pending, SaveWarning } from '../components/StatusPanel';

/**
 * The shell is built once and then patched, so the intake field keeps its focus
 * and half-typed contents while the ledger around it redraws.
 */

const VIEWS: readonly { value: View; label: string; hint: string }[] = [
  { value: 'month', label: 'Month', hint: 'Show the whole calendar month' },
  { value: 'recent', label: 'Recent', hint: 'Show the last three weeks as a band' },
];

export function mountApp(root: HTMLElement, store: Store): void {
  const today = store.today();
  const live = attr(el('p', 'live'), { role: 'status', 'aria-live': 'polite' });
  const tally = el('dl', 'tallies');
  const form = HabitForm(store.actions);
  const warning = el('div', 'warn-slot');
  const list = el('div');

  const masthead = el(
    'header',
    'masthead',
    el('p', 'term', 'Kept by hand, in this browser'),
    el('h1', 'title', el('span', undefined, 'The Daily'), el('span', 'title__x', 'Ledger')),
    el('p', 'date term', 'Entry for ', attr(el('time', 'date__d', longDate(today)), { datetime: today })),
    tally,
    live,
  );

  const switches = VIEWS.map((option) => {
    const button = attr(el('button', 'tab', option.label), {
      type: 'button',
      role: 'radio',
      'aria-checked': String(option.value === store.getState().view),
      'aria-label': option.hint,
    });
    button.addEventListener('click', () => store.actions.setView(option.value));
    return button;
  });

  const nav = attr(
    el('nav', 'viewbar', el('span', 'term', 'Record'), attr(el('div', 'tabs', ...switches), { role: 'radiogroup', 'aria-label': 'Record view' })),
    { 'aria-label': 'Record view' },
  );

  const main = attr(
    el(
      'main',
      'main',
      warning,
      attr(
        el('section', 'intake', attr(el('h2', 'h2', 'Open an entry'), { id: 'intake' }), el('p', 'body', 'One line per habit. The ledger counts the days for you.'), form.element),
        { 'aria-labelledby': 'intake' },
      ),
      attr(
        el('section', 'entries', el('div', 'entries__head', attr(el('h2', 'h2', 'The record'), { id: 'rec' }), nav), list),
        { 'aria-labelledby': 'rec' },
      ),
    ),
    { id: 'ledger' },
  );

  const footer = el(
    'footer',
    'colophon term',
    'Everything above is held in this browser alone. No account, no server.',
    mark('flourish', '❧'),
  );

  fill(root, [
    attr(el('a', 'skip', 'Skip to the ledger'), { href: '#ledger' }),
    el('div', 'shell', masthead, main, footer),
  ]);

  let count = 0;
  const paint = (): void => {
    const state = store.getState();
    const summaries = store.summaries();
    if (state.habits.length > count) form.reset();
    count = state.habits.length;

    form.error(state.formError);
    live.textContent = state.notice ?? '';
    switches.forEach((b, i) => b.setAttribute('aria-checked', String(VIEWS[i]?.value === state.view)));
    fill(tally, tallies(state, summaries));
    fill(warning, state.phase === 'ready' && state.saveError !== null ? [SaveWarning(state.saveError)] : []);
    fill(list, [entries(state, summaries, store, form)]);
  };

  store.subscribe(paint);
  paint();
  store.load();
}

function entries(state: AppState, summaries: Summary[], store: Store, form: FormHandle): HTMLElement {
  if (state.phase === 'pending') return Pending();
  if (state.phase === 'failed') return Failed(state.saveError ?? 'No reason was recorded.', () => store.load());
  if (summaries.length === 0) return Empty(() => form.focus());

  const today = store.today();
  return el('div', 'cards', ...summaries.map((s) => HabitCard(s, state.view, today, store.actions)));
}

function tallies(state: AppState, summaries: Summary[]): HTMLElement[] {
  if (state.phase !== 'ready' || summaries.length === 0) return [];
  const done = summaries.filter((s) => s.streak.today).length;
  const best = summaries.reduce((m, s) => Math.max(m, s.streak.current), 0);
  const seals = summaries.reduce((n, s) => n + s.milestones.earned.length, 0);

  return [
    ['Entries', `${summaries.length}`],
    ['Marked today', `${done}/${summaries.length}`],
    ['Longest run', `${best}d`],
    ['Seals', `${seals}`],
  ].map(([term, value]) => el('div', 'pair', el('dt', 'term', term ?? ''), el('dd', 'value', value ?? '')));
}
