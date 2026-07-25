import type { Actions, CalendarDay, DayKey, Summary, View } from '../types';
import {
  dayOfMonth,
  initial,
  longDate,
  monthGrid,
  monthTitle,
  recentDays,
  sameMonth,
  shortDate,
  toDayKey,
} from '../lib/dates';
import { attr, data, el, mark, sr } from '../lib/dom';
import { MILESTONES } from '../lib/milestones';
import { describeStreak } from '../lib/streak';

const READ = { done: 'done', missed: 'missed', future: 'not yet', before: 'before it was added' };

/** One habit written up as a ledger entry: tally, seals, stamp and record. */
export function HabitCard(s: Summary, view: View, today: DayKey, actions: Actions): HTMLElement {
  const { habit, streak } = s;
  const on = streak.today;
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

  const body = el(
    'div',
    'card__body',
    el('div', 'tally', Tally(habit.name, s), stamp),
    el('div', 'col', Seals(s), Record(view, s, today)),
  );

  return data(attr(el('article', 'card', head, body), { 'aria-labelledby': `h-${habit.id}` }), {
    ink: habit.ink,
    status: streak.status,
  });
}

function Tally(name: string, s: Summary): HTMLElement {
  const line = describeStreak(s.streak);
  return attr(
    el(
      'div',
      'streak',
      sr(`${name}: ${s.streak.current} day streak. ${line}.`),
      data(el('p', 'figure', el('span', 'n', `${s.streak.current}`), el('span', 'term', 'days')), {
        status: s.streak.status,
      }),
      data(el('p', 'caption', line), { status: s.streak.status }),
      el('p', 'term', `Record ${s.streak.longest} · Marked ${s.streak.total}`),
    ),
    { 'aria-label': `Current streak for ${name}` },
  );
}

function Seals(s: Summary): HTMLElement {
  const got = new Set(s.seals.earned.map((m) => m.days));
  const items = MILESTONES.map((m) => {
    const label = `${m.label} seal ${got.has(m.days) ? 'earned' : 'not yet reached'}`;
    return data(attr(el('li', 'seal', mark('', m.seal), sr(label)), { title: m.label }), {
      state: got.has(m.days) ? 'earned' : s.seals.next?.days === m.days ? 'next' : 'locked',
    });
  });
  const note = s.seals.next
    ? `${s.seals.left} days to the ${s.seals.next.label} seal`
    : 'Every seal earned.';
  return el('div', 'seals', attr(el('ul', 'seals__row', ...items), { role: 'list' }), el('p', 'term', note));
}

/** The record: a full month, or the last three weeks as a scrolling band. */
function Record(view: View, s: Summary, today: DayKey): HTMLElement {
  const month = view === 'month';
  const opened = toDayKey(new Date(s.habit.createdAt));
  const keys = month ? monthGrid(today) : recentDays(today, 21);

  const cells = keys.map((day): HTMLElement => {
    const d: CalendarDay = {
      day,
      n: dayOfMonth(day),
      state: s.days.has(day)
        ? 'done'
        : day > today
          ? 'future'
          : day < opened
            ? 'before'
            : 'missed',
      isToday: day === today,
      outside: month && !sameMonth(day, today),
    };
    const label = `${longDate(day)}: ${READ[d.state]}`;
    return data(attr(el('li', 'day', mark('', `${d.n}`), sr(label)), { title: label }), {
      state: d.state,
      ink: s.habit.ink,
      today: `${d.isToday}`,
      outside: `${d.outside}`,
    });
  });

  const heads = month
    ? attr(el('ul', 'heads', ...Array.from({ length: 7 }, (_, i) => el('li', undefined, initial(i)))), {
        'aria-hidden': 'true',
        role: 'list',
      })
    : null;

  return attr(
    el(
      'section',
      'record',
      el('h4', 'term', month ? monthTitle(today) : 'Last 21 days'),
      heads,
      attr(el('ol', month ? 'grid' : 'strip', ...cells), { role: 'list' }),
    ),
    { 'aria-label': `${s.habit.name} record` },
  );
}
