import type { MilestoneProgress } from '../types';
import { MILESTONES } from '../lib/milestones';
import { attr, data, el, mark, sr } from '../lib/dom';

/** Seals earned so far, then a gauge showing the distance to the next rung. */
export function MilestoneRail(name: string, p: MilestoneProgress): HTMLElement {
  const earned = new Set(p.earned.map((m) => m.days));

  const seals = MILESTONES.map((m) => {
    const label = `${m.label} seal ${earned.has(m.days) ? 'earned' : 'not yet reached'}`;
    return data(
      attr(el('li', 'seal', mark('seal__n', m.seal), mark('term', `${m.days}d`), sr(label)), {
        title: m.label,
      }),
      { state: earned.has(m.days) ? 'earned' : p.next?.days === m.days ? 'next' : 'locked' },
    );
  });

  return el('div', 'seals', attr(el('ul', 'seals__row', ...seals), { role: 'list' }), Gauge(name, p));
}

function Gauge(name: string, p: MilestoneProgress): HTMLElement {
  if (p.next === null) return el('p', 'gauge--done', 'Every seal earned.');
  const percent = Math.round(p.ratio * 100);

  return el(
    'div',
    'gauge',
    attr(el('div', 'track', attr(el('div', 'fill'), { style: `--fill:${percent}%` })), {
      role: 'progressbar',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': percent,
      'aria-valuetext': `${p.left} days until the ${p.next.label} seal`,
      'aria-label': `Progress towards the next seal for ${name}`,
    }),
    el('p', 'term', el('span', 'count', String(p.left)), ` days to the ${p.next.label} seal`),
  );
}
