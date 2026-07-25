import type { Actions, DayKey, Summary } from '../types';
import type { Ledger } from '../state/store';
import { dayOfMonth, initial, longDate, monthGrid, monthTitle, sameMonth, shortDate, toDayKey } from '../lib/dates';
import { MILESTONES } from '../lib/milestones';
import { describeStreak } from '../lib/streak';
import { MAX, charsLeft } from '../lib/validation';
import { attr, data, el, empty, mark, sr } from './dom';

const READ = { done: 'done', missed: 'missed', future: 'not yet', before: 'before it was added' };

const panel = (kind: string, brow: string, title: string, ...rest: (Node | string)[]): HTMLElement =>
  el('section', `panel panel--${kind}`, el('p', 'term', brow), el('h2', 'panel__t', title), ...rest);

const ghost = (label: string, press: () => void): HTMLElement => {
  const b = attr(el('button', 'button button--ghost', label), { type: 'button' });
  b.addEventListener('click', press);
  return b;
};

/** One habit as a ledger entry: tally, seals, stamp, and the month's record. */
function Card(s: Summary, today: DayKey, actions: Actions): HTMLElement {
  const { habit, streak } = s;
  const on = streak.today;
  const line = describeStreak(streak);
  const opened = toDayKey(new Date(habit.createdAt));

  const stamp = data(
    attr(el('button', 'stamp', mark('', on ? '✓' : '○'), on ? 'Marked today' : 'Mark today'), {
      type: 'button',
      'aria-pressed': `${on}`,
      'aria-label': on ? `Undo today's mark for ${habit.name}` : `Mark ${habit.name} done today`,
    }),
    { marked: `${on}` },
  );
  stamp.addEventListener('click', () => actions.toggle(habit.id));

  const close = attr(el('button', 'remove', mark('', '×'), sr(`Close ${habit.name}`)), {
    type: 'button',
    'aria-label': `Close the ${habit.name} entry and erase its record`,
  });
  close.addEventListener('click', () => actions.remove(habit.id));

  const got = new Set(s.seals.earned.map((m) => m.days));
  const seals = MILESTONES.map((m) => {
    const label = `${m.label} seal ${got.has(m.days) ? 'earned' : 'not yet reached'}`;
    return data(attr(el('li', 'seal', mark('', m.seal), sr(label)), { title: m.label }), {
      state: got.has(m.days) ? 'earned' : s.seals.next?.days === m.days ? 'next' : 'locked',
    });
  });

  const cells = monthGrid(today).map((day) => {
    const state = s.days.has(day)
      ? 'done'
      : day > today
        ? 'future'
        : day < opened
          ? 'before'
          : 'missed';
    const label = `${longDate(day)}: ${READ[state]}`;
    return data(attr(el('li', 'day', mark('', `${dayOfMonth(day)}`), sr(label)), { title: label }), {
      state,
      ink: habit.ink,
      today: `${day === today}`,
      outside: `${!sameMonth(day, today)}`,
    });
  });

  const heads = attr(
    el('ul', 'heads', ...Array.from({ length: 7 }, (_, i) => el('li', undefined, initial(i)))),
    { 'aria-hidden': 'true', role: 'list' },
  );

  const tally = attr(
    el(
      'div',
      'streak',
      sr(`${habit.name}: ${streak.current} day streak. ${line}.`),
      data(el('p', 'figure', el('span', 'n', `${streak.current}`), el('span', 'term', 'days')), {
        status: streak.status,
      }),
      data(el('p', 'caption', line), { status: streak.status }),
      el('p', 'term', `Record ${streak.longest} · Marked ${streak.total}`),
    ),
    { 'aria-label': `Current streak for ${habit.name}` },
  );

  const head = el(
    'header',
    'card__head',
    data(attr(el('span', 'spine'), { 'aria-hidden': 'true' }), { ink: habit.ink }),
    el(
      'div',
      undefined,
      attr(el('h3', 'card__name', habit.name), { id: `h-${habit.id}` }),
      el('p', 'term', 'Opened ', attr(el('time', undefined, shortDate(opened)), { datetime: opened })),
    ),
    close,
  );

  const record = attr(
    el(
      'section',
      'record',
      el('h4', 'term', monthTitle(today)),
      heads,
      attr(el('ol', 'grid', ...cells), { role: 'list' }),
    ),
    { 'aria-label': `${habit.name} record` },
  );

  return data(
    attr(
      el(
        'article',
        'card',
        head,
        el(
          'div',
          'card__body',
          el('div', 'tally', tally, stamp),
          el(
            'div',
            'col',
            el(
              'div',
              'seals',
              attr(el('ul', 'seals__row', ...seals), { role: 'list' }),
              el('p', 'term', s.seals.next ? `${s.seals.left} days to the ${s.seals.next.label} seal` : 'Every seal earned.'),
            ),
            record,
          ),
        ),
      ),
      { 'aria-labelledby': `h-${habit.id}` },
    ),
    { ink: habit.ink, status: streak.status },
  );
}

/** The intake line: one real label, one field, one message slot beneath it. */
function Form(actions: Actions): {
  node: HTMLFormElement;
  error(m: string | null): void;
  focus(): void;
  reset(): void;
} {
  const input = attr(el('input', 'input'), {
    id: 'name',
    type: 'text',
    required: true,
    maxlength: MAX,
    autocomplete: 'off',
    placeholder: 'Read ten pages',
    'aria-describedby': 'hint error',
    'aria-invalid': 'false',
  });
  const count = attr(el('span', 'term', `${MAX}`), { 'aria-hidden': 'true' });
  const err = data(attr(el('p', 'error'), { id: 'error', role: 'alert' }), { on: 'false' });
  const submit = attr(el('button', 'button', mark('', '✚'), 'Open entry'), {
    type: 'submit',
    disabled: true,
  });

  const sync = (): void => {
    const left = charsLeft(input.value);
    count.textContent = `${left}`;
    count.dataset['low'] = `${left <= 10}`;
    submit.disabled = !input.value.trim();
  };
  const error = (m: string | null): void => {
    err.textContent = m ?? '';
    err.dataset['on'] = `${m !== null}`;
    input.setAttribute('aria-invalid', `${m !== null}`);
  };

  input.addEventListener('input', () => {
    sync();
    if (err.dataset['on'] === 'true') error(null);
  });

  const node = attr(
    el(
      'form',
      'form',
      el(
        'div',
        'field',
        el('div', 'row', attr(el('label', 'term', 'Habit name'), { for: 'name' }), count),
        input,
        attr(el('p', 'term', `Between 2 and ${MAX} characters, and unique.`), { id: 'hint' }),
        err,
      ),
      submit,
    ),
    { novalidate: true },
  );
  node.addEventListener('submit', (e) => {
    e.preventDefault();
    actions.add(input.value);
  });

  sync();
  return {
    node,
    error,
    focus: () => input.focus(),
    reset: () => {
      input.value = '';
      sync();
    },
  };
}

/** The shell is built once and patched, so the field keeps focus and text. */
export function mountApp(root: HTMLElement, ledger: Ledger): void {
  const today = ledger.today();
  const live = attr(el('p', 'live'), { role: 'status', 'aria-live': 'polite' });
  const form = Form(ledger.actions);
  const list = el('div');

  empty(root, [
    attr(el('nav', undefined, attr(el('a', 'skip', 'Skip to the ledger'), { href: '#ledger' })), {
      'aria-label': 'Shortcuts',
    }),
    el(
      'div',
      'shell',
      el(
        'header',
        'masthead',
        el('p', 'term', 'Kept by hand, in this browser'),
        el('h1', 'title', el('span', undefined, 'The Daily'), el('span', 'title__x', 'Ledger')),
        el('p', 'term', 'Entry for ', attr(el('time', 'date', longDate(today)), { datetime: today })),
        live,
      ),
      attr(
        el(
          'main',
          'main',
          attr(
            el(
              'section',
              'intake',
              attr(el('h2', 'h2', 'Open an entry'), { id: 'intake' }),
              el('p', 'body', 'One line per habit. The ledger counts the days for you.'),
              form.node,
            ),
            { 'aria-labelledby': 'intake' },
          ),
          attr(el('section', undefined, attr(el('h2', 'h2', 'The record'), { id: 'rec' }), list), {
            'aria-labelledby': 'rec',
          }),
        ),
        { id: 'ledger' },
      ),
      el('footer', 'colophon term', 'Held in this browser alone. No account, no server.'),
    ),
  ]);

  let count = 0;
  const paint = (): void => {
    const s = ledger.state();
    const rows = ledger.summaries();
    if (s.habits.length > count) form.reset();
    count = s.habits.length;
    form.error(s.formError);
    live.textContent = s.notice ?? '';

    empty(list, [
      s.phase === 'pending'
        ? attr(panel('pending', 'Reading', 'Opening the ledger'), { 'aria-busy': 'true' })
        : s.phase === 'failed'
          ? attr(
              panel('error', 'Blotted', 'The ledger would not open', el('p', 'body', s.saveError ?? ''), ghost('Try again', ledger.load)),
              { role: 'alert' },
            )
          : rows.length === 0
            ? panel(
                'empty',
                'Blank pages',
                'Nothing recorded yet',
                el('p', 'body', 'A streak is only ever one day old to begin with.'),
                ghost('Name your first habit', form.focus),
              )
            : el('div', 'cards', ...rows.map((r) => Card(r, ledger.today(), ledger.actions))),
      s.phase === 'ready' && s.saveError
        ? attr(el('p', 'term', `Not being saved. ${s.saveError}`), { role: 'alert' })
        : null,
    ]);
  };

  ledger.subscribe(paint);
  paint();
  ledger.load();
}
