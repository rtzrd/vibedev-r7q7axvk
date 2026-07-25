import type { AppState, HabitSummary } from '../types';
import type { LedgerStore } from '../state/store';
import { formatLongDate } from '../lib/dates';
import { attr, el, fill, glyph } from '../lib/dom';
import { HabitCard } from '../components/HabitCard';
import { HabitForm, type HabitFormHandle } from '../components/HabitForm';
import { EmptyPanel, ErrorPanel, LoadingPanel, StorageWarning } from '../components/StatusPanel';
import { ViewSwitch, type ViewSwitchHandle } from '../components/ViewSwitch';

/**
 * The render layer.
 *
 * The shell is built once and then patched: only the entry list, the banners
 * and the live region change between passes, so the intake field keeps its
 * focus and its half-typed contents while the ledger around it redraws.
 */

interface Surfaces {
  readonly live: HTMLElement;
  readonly warning: HTMLElement;
  readonly entries: HTMLElement;
  readonly tally: HTMLElement;
  readonly form: HabitFormHandle;
  readonly viewSwitch: ViewSwitchHandle;
}

/** Build the shell, wire it to the store and start the first read. */
export function mountApp(root: HTMLElement, store: LedgerStore): void {
  const surfaces = buildShell(root, store);
  let habitCount = 0;

  store.subscribe((state) => {
    if (state.habits.length > habitCount) surfaces.form.reset();
    habitCount = state.habits.length;
    paint(surfaces, state, store);
  });

  paint(surfaces, store.getState(), store);
  store.load();
}

function buildShell(root: HTMLElement, store: LedgerStore): Surfaces {
  const today = store.today();

  const live = attr(el('p', 'live'), {
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });

  const tally = el('dl', 'masthead__tally');

  const masthead = el(
    'header',
    'masthead',
    el(
      'div',
      'masthead__brand',
      el('p', 'masthead__eyebrow', 'Kept by hand, in this browser'),
      el(
        'h1',
        'masthead__title',
        el('span', 'masthead__word', 'The Daily'),
        el('span', 'masthead__word masthead__word--accent', 'Ledger'),
      ),
    ),
    el(
      'p',
      'masthead__date',
      el('span', 'masthead__date-label', 'Entry for'),
      attr(el('time', undefined, formatLongDate(today)), { datetime: today }),
    ),
    tally,
    live,
  );

  const form = HabitForm(store.actions);

  const intake = attr(
    el(
      'section',
      'intake',
      attr(el('h2', 'section__heading', 'Open an entry'), { id: 'intake-heading' }),
      el('p', 'section__lede', 'One line per habit. The ledger counts the days for you.'),
      form.element,
    ),
    { 'aria-labelledby': 'intake-heading' },
  );

  const viewSwitch = ViewSwitch(store.getState().view, store.actions.setView);
  const warning = el('div', 'warning-slot');
  const entries = el('div', 'entries__list');

  const record = attr(
    el(
      'section',
      'entries',
      el(
        'div',
        'entries__header',
        attr(el('h2', 'section__heading', 'The record'), { id: 'entries-heading' }),
        viewSwitch.element,
      ),
      entries,
    ),
    { 'aria-labelledby': 'entries-heading' },
  );

  const main = attr(el('main', 'shell__main', warning, intake, record), { id: 'ledger' });

  const colophon = el(
    'footer',
    'colophon',
    el(
      'p',
      'colophon__line',
      'Everything above is held in this browser alone. No account, no server, no copy anywhere else.',
    ),
    glyph('colophon__mark', '❧'),
  );

  const skip = attr(el('a', 'skip-link', 'Skip to the ledger'), { href: '#ledger' });

  fill(root, [skip, el('div', 'shell', masthead, main, colophon)]);

  return { live, warning, entries, tally, form, viewSwitch };
}

function paint(surfaces: Surfaces, state: AppState, store: LedgerStore): void {
  const summaries = store.getSummaries();

  surfaces.form.showError(state.formError);
  surfaces.viewSwitch.setView(state.view);
  surfaces.live.textContent = state.notice ?? '';
  fill(surfaces.tally, tallyFor(state, summaries));
  fill(
    surfaces.warning,
    state.phase === 'ready' && state.storageError !== null
      ? [StorageWarning(state.storageError)]
      : [],
  );
  fill(surfaces.entries, [entriesFor(state, summaries, store, surfaces)]);
}

function entriesFor(
  state: AppState,
  summaries: readonly HabitSummary[],
  store: LedgerStore,
  surfaces: Surfaces,
): HTMLElement {
  if (state.phase === 'pending') return LoadingPanel();
  if (state.phase === 'failed') {
    return ErrorPanel(state.storageError ?? 'The reason was not recorded.', () => store.load());
  }
  if (summaries.length === 0) return EmptyPanel(() => surfaces.form.focusField());

  const today = store.today();
  const cards = summaries.map((summary) => HabitCard(summary, state.view, today, store.actions));
  return el('div', 'cards', ...cards);
}

function tallyFor(state: AppState, summaries: readonly HabitSummary[]): HTMLElement[] {
  if (state.phase !== 'ready' || summaries.length === 0) return [];

  const marked = summaries.filter((summary) => summary.streak.completedToday).length;
  const best = summaries.reduce((max, summary) => Math.max(max, summary.streak.current), 0);
  const seals = summaries.reduce((total, summary) => total + summary.milestones.earned.length, 0);

  return [
    pair('Entries', String(summaries.length)),
    pair('Marked today', `${marked}/${summaries.length}`),
    pair('Longest run', `${best}d`),
    pair('Seals', String(seals)),
  ];
}

/** A `div` inside a `dl` is the sanctioned way to keep a pair together. */
function pair(term: string, value: string): HTMLElement {
  return el(
    'div',
    'masthead__pair',
    el('dt', 'masthead__term', term),
    el('dd', 'masthead__value', value),
  );
}
