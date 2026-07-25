import type { HabitSummary, LedgerActions, LedgerView } from '../types';
import { formatShortDate, toDayKey } from '../lib/dates';
import { attr, data, el, glyph, hidden } from '../lib/dom';
import { DayRecord } from './DayGrid';
import { MilestoneRail } from './MilestoneSeal';
import { StreakCounter } from './StreakCounter';

/** How long a removal stays armed before it disarms itself. */
const REMOVAL_ARM_MS = 4_000;

/**
 * One habit, written up as a ledger entry: the name and its ink, the tally,
 * the seals it has earned, the stamp for today, and the day-by-day record.
 */
export function HabitCard(
  summary: HabitSummary,
  view: LedgerView,
  today: string,
  actions: LedgerActions,
): HTMLElement {
  const { habit, streak } = summary;
  const marked = streak.completedToday;
  const opened = toDayKey(new Date(habit.createdAt));

  const stamp = data(
    attr(
      el(
        'button',
        'stamp',
        glyph('stamp__glyph', marked ? '✓' : '○'),
        el('span', 'stamp__text', marked ? 'Marked today' : 'Mark today'),
      ),
      {
        type: 'button',
        'aria-pressed': String(marked),
        'aria-label': marked
          ? `Undo today's mark for ${habit.name}`
          : `Mark ${habit.name} as done today`,
      },
    ),
    { marked: String(marked) },
  );
  stamp.addEventListener('click', () => actions.toggleToday(habit.id));

  const identity = el(
    'div',
    'card__identity',
    attr(el('h3', 'card__name', habit.name), { id: `habit-${habit.id}` }),
    el(
      'p',
      'card__meta',
      'Opened ',
      attr(el('time', undefined, formatShortDate(opened)), { datetime: opened }),
    ),
  );

  const header = el(
    'header',
    'card__header',
    data(attr(el('span', 'card__ink'), { 'aria-hidden': 'true' }), { ink: habit.ink }),
    identity,
    RemoveButton(summary, actions),
  );

  const body = el(
    'div',
    'card__body',
    el('div', 'card__tally', StreakCounter(habit.name, streak), stamp),
    el(
      'div',
      'card__record',
      MilestoneRail(habit.name, summary.milestones),
      DayRecord(view, summary, today),
    ),
  );

  return data(attr(el('article', 'card', header, body), { 'aria-labelledby': `habit-${habit.id}` }), {
    ink: habit.ink,
    status: streak.status,
  });
}

/** Removal is armed by the first press and carried out by the second. */
function RemoveButton(summary: HabitSummary, actions: LedgerActions): HTMLButtonElement {
  const { habit } = summary;
  let armed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const label = el('span', 'remove__text', 'Close');
  const button = data(
    attr(el('button', 'remove', glyph('remove__glyph', '×'), label, hidden('Press twice to confirm.')), {
      type: 'button',
      'aria-label': `Close the ${habit.name} entry and erase its record`,
    }),
    { armed: 'false' },
  );

  function disarm(): void {
    armed = false;
    button.dataset['armed'] = 'false';
    label.textContent = 'Close';
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  button.addEventListener('click', () => {
    if (armed) {
      disarm();
      actions.removeHabit(habit.id);
      return;
    }
    armed = true;
    button.dataset['armed'] = 'true';
    label.textContent = 'Confirm';
    timer = setTimeout(disarm, REMOVAL_ARM_MS);
  });
  button.addEventListener('blur', disarm);

  return button;
}
