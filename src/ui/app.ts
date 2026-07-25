import type { Shelf, Snack, State } from '../types';
import { bySoonest, judge, shortDate, toDayKey } from '../lib/freshness';
import { storage } from '../lib/storage';
import { MAX_LIFE, MAX_NAME, validate } from '../lib/validate';
import { append, attr, el, empty, sr } from './dom';

const LABEL = { fresh: 'Good', aging: 'Getting old', stale: 'Past it' };

/** The whole app: state, the form, and the live shelf. */
export function mountApp(root: HTMLElement, now = (): Date => new Date()): void {
  let state: State = { phase: 'loading', snacks: [], formError: null, notice: null, saveError: null };

  const live = attr(el('p', 'live'), { role: 'status', 'aria-live': 'polite' });
  const list = el('div', 'shelf');
  const tally = el('p', 'tally');

  const field = (
    id: string,
    label: string,
    type: string,
    extra: Record<string, string | number | boolean>,
  ): { wrap: HTMLElement; input: HTMLInputElement } => {
    const input = attr(el('input', 'input'), { id, name: id, type, required: true, ...extra });
    return {
      wrap: el('p', 'field', attr(el('label', 'label', label), { for: id }), input),
      input,
    };
  };

  const name = field('snack-name', 'Snack', 'text', {
    maxlength: MAX_NAME,
    placeholder: 'Salted crisps',
    autocomplete: 'off',
  });
  const bought = field('snack-bought', 'Bought on', 'date', { max: toDayKey(now()) });
  const life = field('snack-life', 'Lasts (days)', 'number', {
    min: 1,
    max: MAX_LIFE,
    inputmode: 'numeric',
    placeholder: '30',
  });
  bought.input.value = toDayKey(now());

  const error = attr(el('p', 'error'), { role: 'alert' });
  const submit = attr(el('button', 'add', 'Add snack'), { type: 'submit' });

  const form = attr(el('form', 'form', name.wrap, bought.wrap, life.wrap, submit, error), {
    novalidate: true,
    'aria-labelledby': 'add-heading',
  });

  for (const input of [name.input, bought.input, life.input]) {
    input.addEventListener('input', () => {
      if (state.formError) set({ formError: null });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const check = validate(name.input.value, bought.input.value, life.input.value, state.snacks, now());
    if (!check.ok) return set({ formError: check.message, notice: null });
    const snacks = [...state.snacks, check.value];
    name.input.value = '';
    life.input.value = '';
    name.input.focus();
    set({
      snacks,
      formError: null,
      notice: `${check.value.name} added.`,
      saveError: storage.write(snacks),
    });
  });

  empty(root, [
    attr(el('a', 'skip', 'Skip to the shelf'), { href: '#shelf' }),
    el(
      'div',
      'wrap',
      el(
        'header',
        'top',
        el('p', 'kicker', 'Pantry check'),
        el('h1', 'title', 'Is it still ', el('em', undefined, 'good'), '?'),
        el('p', 'lede', 'Add what you bought and when. The shelf tells you what to eat first.'),
        tally,
        live,
      ),
      el(
        'main',
        'main',
        attr(
          el(
            'section',
            'card',
            attr(el('h2', 'h2', 'Add a snack'), { id: 'add-heading' }),
            form,
          ),
          { 'aria-labelledby': 'add-heading' },
        ),
        attr(
          el('section', 'shelf-wrap', attr(el('h2', 'h2', 'On the shelf'), { id: 'shelf' }), list),
          { 'aria-labelledby': 'shelf' },
        ),
      ),
      el('footer', 'foot', 'Kept in this browser only.'),
    ),
  ]);

  function set(patch: Partial<State>): void {
    state = { ...state, ...patch };
    paint();
  }

  function remove(snack: Snack): void {
    const snacks = state.snacks.filter((s) => s.id !== snack.id);
    set({ snacks, notice: `${snack.name} removed.`, saveError: storage.write(snacks) });
  }

  function paint(): void {
    error.textContent = state.formError ?? '';
    error.dataset['on'] = `${state.formError !== null}`;
    submit.disabled = state.phase !== 'ready';
    live.textContent = state.notice ?? '';

    const shelves: Shelf[] = state.snacks
      .map((snack) => ({ snack, verdict: judge(snack, now()) }))
      .sort((a, b) => bySoonest(a.verdict, b.verdict));

    const counts = { fresh: 0, aging: 0, stale: 0 };
    for (const s of shelves) counts[s.verdict.status] += 1;
    tally.textContent = shelves.length
      ? `${counts.fresh} good · ${counts.aging} getting old · ${counts.stale} to toss`
      : '';

    empty(list, [
      state.phase === 'loading'
        ? attr(el('p', 'note', 'Opening the pantry…'), { 'aria-busy': 'true' })
        : state.phase === 'failed'
          ? attr(el('p', 'note note--bad', state.saveError ?? 'Something went wrong.'), { role: 'alert' })
          : shelves.length === 0
            ? el('p', 'note', 'Nothing here yet. Add the first packet above.')
            : el('ul', 'rows', ...shelves.map(row)),
      state.phase === 'ready' && state.saveError
        ? attr(el('p', 'note note--bad', `Not being saved. ${state.saveError}`), { role: 'alert' })
        : null,
    ]);
  }

  function row({ snack, verdict }: Shelf): HTMLElement {
    const bin = attr(el('button', 'bin', '✕'), {
      type: 'button',
      'aria-label': `Remove ${snack.name}`,
    });
    bin.addEventListener('click', () => remove(snack));

    const meter = attr(el('span', 'meter'), {
      style: `--used:${Math.round(verdict.ratio * 100)}%`,
      'aria-hidden': 'true',
    });

    const item = el('li', 'row');
    item.dataset['status'] = verdict.status;
    append(item, [
      el('span', 'dot', sr(`${LABEL[verdict.status]}: `)),
      el(
        'span',
        'facts',
        el('span', 'name', snack.name),
        el(
          'span',
          'sub',
          `Bought ${shortDate(snack.bought)} · lasts ${snack.shelfLife} days`,
        ),
        meter,
      ),
      el('span', 'verdict', el('strong', undefined, LABEL[verdict.status]), el('span', 'note-sm', verdict.note)),
      bin,
    ]);
    return item;
  }

  paint();
  // Read after the first paint so the loading line is actually seen; a hidden
  // tab never paints, so a timer races the frame.
  let done = false;
  const load = (): void => {
    if (done) return;
    done = true;
    const read = storage.read();
    set(
      read.ok
        ? { phase: 'ready', snacks: read.value, saveError: null }
        : { phase: 'failed', saveError: read.message },
    );
  };
  requestAnimationFrame(load);
  setTimeout(load);
}
