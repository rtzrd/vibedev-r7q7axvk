/** A calendar day in the shopper's own timezone, `YYYY-MM-DD`. */
export type DayKey = string;

/** Green: eat soon. Yellow: getting old. Red: toss it. */
export type Freshness = 'fresh' | 'aging' | 'stale';

export interface Snack {
  id: string;
  name: string;
  bought: DayKey;
  shelfLife: number;
}

export interface Verdict {
  status: Freshness;
  daysLeft: number;
  daysKept: number;
  ratio: number;
  note: string;
}

export interface Shelf {
  snack: Snack;
  verdict: Verdict;
}

export type Check = { ok: true; value: Snack } | { ok: false; message: string };
export type Phase = 'loading' | 'ready' | 'failed';

export interface State {
  phase: Phase;
  snacks: Snack[];
  formError: string | null;
  notice: string | null;
  saveError: string | null;
}
