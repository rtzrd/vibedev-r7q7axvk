import type { Milestone, MilestoneProgress } from '../types';
import { MILESTONES } from '../lib/milestones';
import { attr, data, el, glyph, hidden } from '../lib/dom';

/**
 * The seal rail: one wax seal per milestone, pressed once its run is reached,
 * followed by a ruled gauge showing the distance to the next rung.
 */
export function MilestoneRail(habitName: string, progress: MilestoneProgress): HTMLElement {
  const earned = new Set(progress.earned.map((milestone) => milestone.days));
  const seals = MILESTONES.map((milestone) =>
    Seal(milestone, earned.has(milestone.days), progress.next?.days === milestone.days),
  );

  return el(
    'div',
    'seals',
    attr(el('ul', 'seals__row', ...seals), { role: 'list' }),
    Gauge(habitName, progress),
  );
}

function Seal(milestone: Milestone, earned: boolean, isNext: boolean): HTMLLIElement {
  const label = `${milestone.label} seal ${earned ? 'earned' : 'not yet reached'}`;

  return data(
    attr(
      el(
        'li',
        'seals__item',
        glyph('seals__mark', milestone.seal),
        glyph('seals__days', `${milestone.days}d`),
        hidden(label),
      ),
      { title: milestone.label },
    ),
    { state: earned ? 'earned' : isNext ? 'next' : 'locked' },
  );
}

function Gauge(habitName: string, progress: MilestoneProgress): HTMLElement {
  const next = progress.next;
  if (next === null) {
    return el('p', 'gauge gauge--done', 'Every seal earned. The ledger holds no higher mark.');
  }

  const percent = Math.round(progress.ratio * 100);
  const seal = next.label.toLowerCase();

  const track = attr(el('div', 'gauge__track', attr(el('div', 'gauge__fill'), {
    style: `--fill:${percent}%`,
  })), {
    role: 'progressbar',
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': percent,
    'aria-valuetext': `${progress.daysRemaining} days until the ${seal} seal`,
    'aria-label': `Progress towards the next seal for ${habitName}`,
  });

  return el(
    'div',
    'gauge',
    track,
    el(
      'p',
      'gauge__caption',
      el('span', 'gauge__count', String(progress.daysRemaining)),
      ` days to the ${seal} seal`,
    ),
  );
}
