import type { CalendarDay, DayKey, HabitSummary, LedgerView } from '../types';
import {
  dayOfMonth,
  formatLongDate,
  formatMonthTitle,
  isSameMonth,
  monthGrid,
  recentDays,
  toDayKey,
  weekdayIndex,
  weekdayInitial,
} from '../lib/dates';
import { attr, data, el, glyph, hidden } from '../lib/dom';

/** How many days the strip carries; it scrolls when the column is narrow. */
export const STRIP_LENGTH = 21;

/** Turn a run of day keys into render-ready cells for one habit. */
export function buildCalendarDays(
  days: readonly DayKey[],
  summary: HabitSummary,
  today: DayKey,
): CalendarDay[] {
  const opened = toDayKey(new Date(summary.habit.createdAt));

  return days.map((day) => ({
    day,
    dayOfMonth: dayOfMonth(day),
    weekdayIndex: weekdayIndex(day),
    completed: summary.completedDays.has(day),
    isToday: day === today,
    isFuture: day > today,
    beforeHabitExisted: summary.habit.createdAt > 0 && day < opened,
  }));
}

/** The record view for one habit, in whichever form the reader has chosen. */
export function DayRecord(view: LedgerView, summary: HabitSummary, today: DayKey): HTMLElement {
  return view === 'month' ? MonthLedger(summary, today) : RecentStrip(summary, today);
}

/** A full calendar month, ruled into Monday-first weeks. */
export function MonthLedger(summary: HabitSummary, today: DayKey): HTMLElement {
  const days = buildCalendarDays(monthGrid(today), summary, today);
  const heads = Array.from({ length: 7 }, (_, index) =>
    attr(el('li', 'record__head', weekdayInitial(index)), { 'aria-hidden': 'true' }),
  );
  const cells = days.map((day) => DayCell(day, summary, !isSameMonth(day.day, today)));

  return attr(
    el(
      'section',
      'record',
      el('h4', 'record__title', formatMonthTitle(today)),
      attr(el('ul', 'record__heads', ...heads), { role: 'list' }),
      attr(el('ol', 'record__grid', ...cells), { role: 'list' }),
      Legend(),
    ),
    { 'aria-label': `${summary.habit.name} record for ${formatMonthTitle(today)}` },
  );
}

/** The last three weeks laid out as a single scrolling band. */
export function RecentStrip(summary: HabitSummary, today: DayKey): HTMLElement {
  const days = buildCalendarDays(recentDays(today, STRIP_LENGTH), summary, today);
  const cells = days.map((day) =>
    el(
      'li',
      'strip__item',
      glyph('strip__weekday', weekdayInitial(day.weekdayIndex)),
      DayCell(day, summary, false),
    ),
  );

  return attr(
    el(
      'section',
      'record',
      el('h4', 'record__title', `Last ${STRIP_LENGTH} days`),
      attr(el('ol', 'strip', ...cells), { role: 'list' }),
      Legend(),
    ),
    { 'aria-label': `${summary.habit.name} record for the last ${STRIP_LENGTH} days` },
  );
}

function DayCell(day: CalendarDay, summary: HabitSummary, outside: boolean): HTMLElement {
  const state = day.completed
    ? 'done'
    : day.isFuture
      ? 'future'
      : day.beforeHabitExisted
        ? 'before'
        : 'missed';

  const reading = {
    done: 'done',
    future: 'not yet',
    before: 'before this habit was added',
    missed: 'missed',
  }[state];
  const label = `${formatLongDate(day.day)}: ${reading}`;

  return data(
    attr(el('li', 'day', glyph('day__number', String(day.dayOfMonth)), hidden(label)), {
      title: label,
    }),
    {
      state,
      ink: summary.habit.ink,
      today: String(day.isToday),
      outside: String(outside),
    },
  );
}

const LEGEND: readonly [string, string][] = [
  ['done', 'Marked'],
  ['missed', 'Missed'],
  ['future', 'To come'],
];

function Legend(): HTMLElement {
  const items = LEGEND.map(([state, label]) =>
    el(
      'li',
      'legend__item',
      data(attr(el('span', 'legend__swatch'), { 'aria-hidden': 'true' }), { state }),
      label,
    ),
  );
  return attr(el('ul', 'legend', ...items), { role: 'list' });
}
