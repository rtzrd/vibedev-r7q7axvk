import type { Actions, Summary, View } from '../types';
import { shortDate, toDayKey } from '../lib/dates';
import { attr, data, el, mark, sr } from '../lib/dom';
import { DayGrid } from './DayGrid';
import { MilestoneRail } from './MilestoneSeal';
import { StreakCounter } from './StreakCounter';

/** One habit written up as a ledger entry: tally, seals, stamp and record. */
export function HabitCard(s: Summary, view: View, today: string, actions: Actions): HTMLElement {
  const { habit, streak } = s;
  const on = streak.today;
  const opened = toDayKey(new Date(habit.createdAt));

  const stamp = data(
    attr(el('button', 'stamp', mark('', on ? '✓' : '○'), on ? 'Marked today' : 'Mark today'), {
      type: 'button',
      'aria-pressed': String(on),
      'aria-label': on ? `Undo today's mark for ${habit.name}` : `Mark ${habit.name} as done today`,
    }),
    { marked: String(on) },
  );
  stamp.addEventListener('click', () => actions.toggle(habit.id));

  const header = el(
    'header',
    'card__head',
    data(attr(el('span', 'spine'), { 'aria-hidden': 'true' }), { ink: habit.ink }),
    el(
      'div',
      undefined,
      attr(el('h3', 'card__name', habit.name), { id: `h-${habit.id}` }),
      el('p', 'term', 'Opened ', attr(el('time', undefined, shortDate(opened)), { datetime: opened })),
    ),
    RemoveButton(s, actions),
  );

  const body = el(
    'div',
    'card__body',
    el('div', 'tally', StreakCounter(habit.name, streak), stamp),
    el('div', 'record__col', MilestoneRail(habit.name, s.milestones), DayGrid(view, s, today)),
  );

  return data(attr(el('article', 'card', header, body), { 'aria-labelledby': `h-${habit.id}` }), {
    ink: habit.ink,
    status: streak.status,
  });
}

/** Removal is armed by the first press and carried out by the second. */
function RemoveButton(s: Summary, actions: Actions): HTMLButtonElement {
  const text = el('span', undefined, 'Close');
  const button = data(
    attr(el('button', 'remove', mark('', '×'), text, sr('Press twice to confirm.')), {
      type: 'button',
      'aria-label': `Close the ${s.habit.name} entry and erase its record`,
    }),
    { armed: 'false' },
  );

  let armed = false;
  const disarm = (): void => {
    armed = false;
    button.dataset['armed'] = 'false';
    text.textContent = 'Close';
  };

  button.addEventListener('click', () => {
    if (armed) {
      disarm();
      actions.remove(s.habit.id);
      return;
    }
    armed = true;
    button.dataset['armed'] = 'true';
    text.textContent = 'Confirm';
    setTimeout(disarm, 4e3);
  });
  button.addEventListener('blur', disarm);
  return button;
}
