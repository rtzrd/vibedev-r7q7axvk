import type { CalendarDay, DayKey, Summary, View } from '../types';
import {
  dayOfMonth,
  initial,
  longDate,
  monthGrid,
  monthTitle,
  recentDays,
  sameMonth,
  toDayKey,
  weekday,
} from '../lib/dates';
import { attr, data, el, mark, sr } from '../lib/dom';

const STRIP = 21;
const READING = {
  done: 'done',
  missed: 'missed',
  future: 'not yet',
  before: 'before this habit was added',
};

/** Turn a run of day keys into render-ready cells for one habit. */
export function buildDays(days: readonly DayKey[], s: Summary, today: DayKey): CalendarDay[] {
  const opened = toDayKey(new Date(s.habit.createdAt));
  return days.map((day) => ({
    day,
    number: dayOfMonth(day),
    state: s.days.has(day)
      ? 'done'
      : day > today
        ? 'future'
        : s.habit.createdAt > 0 && day < opened
          ? 'before'
          : 'missed',
    isToday: day === today,
    outside: !sameMonth(day, today),
  }));
}

/** The record for one habit: a full month, or the last three weeks as a band. */
export function DayGrid(view: View, s: Summary, today: DayKey): HTMLElement {
  const month = view === 'month';
  const days = buildDays(month ? monthGrid(today) : recentDays(today, STRIP), s, today);
  const cells = days.map((day) => Cell(day, s, month));

  const heads = month
    ? attr(
        el('ul', 'heads', ...Array.from({ length: 7 }, (_, i) => el('li', undefined, initial(i)))),
        { 'aria-hidden': 'true', role: 'list' },
      )
    : null;

  const list = attr(el('ol', month ? 'grid' : 'strip', ...cells), { role: 'list' });

  return attr(
    el('section', 'record', el('h4', 'term', month ? monthTitle(today) : `Last ${STRIP} days`), heads, list, Legend()),
    { 'aria-label': `${s.habit.name} record` },
  );
}

function Cell(day: CalendarDay, s: Summary, month: boolean): HTMLElement {
  const label = `${longDate(day.day)}: ${READING[day.state]}`;
  const cell = data(
    attr(el('li', 'day', mark('n', String(day.number)), sr(label)), { title: label }),
    {
      state: day.state,
      ink: s.habit.ink,
      today: String(day.isToday),
      outside: String(month && day.outside),
    },
  );
  return month ? cell : el('li', 'band', mark('term', initial(weekday(day.day))), cell);
}

function Legend(): HTMLElement {
  const items = (['done', 'missed', 'future'] as const).map((state) =>
    el(
      'li',
      'legend__item',
      data(attr(el('span', 'swatch'), { 'aria-hidden': 'true' }), { state }),
      state === 'done' ? 'Marked' : state === 'missed' ? 'Missed' : 'To come',
    ),
  );
  return attr(el('ul', 'legend term', ...items), { role: 'list' });
}
