# The Daily Ledger

A single-page habit tracker that keeps its record in `localStorage`. No backend, no
accounts, no network calls at runtime.

Track habits, mark today off, and watch the consecutive-day streak count itself. Wax
seals are pressed at seven, thirty and a hundred days. Miss a day and the run resets.

## Running it

```sh
npm install
npm run dev       # development server
npm run test      # unit tests
npm run build     # typecheck, then a production bundle in dist/
```

## Layout of the source

| Path | What lives there |
| --- | --- |
| `src/types.ts` | Domain types: `Habit`, `HabitLogEntry`, `StreakResult`, `Milestone`, and the rest |
| `src/lib/dates.ts` | Local-calendar helpers — day keys, day arithmetic, month grids |
| `src/lib/streak.ts` | `calculateStreak`, the streak rule; pure, and takes its clock as an argument |
| `src/lib/milestones.ts` | The seven / thirty / hundred day ladder and progress towards the next rung |
| `src/lib/storage.ts` | Reads and writes `localStorage`, validating and migrating whatever comes back |
| `src/lib/validation.ts` | Habit-name rules and the messages shown beside the field |
| `src/lib/dom.ts` | Element builders; all user text goes in as text nodes |
| `src/state/store.ts` | State, actions, write-through persistence, midnight rollover |
| `src/components/` | `HabitCard`, `HabitForm`, `StreakCounter`, `DayGrid`, `MilestoneSeal`, `StatusPanel`, `ViewSwitch` |
| `src/render/renderApp.ts` | Builds the shell once, then patches the regions that change |
| `src/styles/` | `tokens.css` for the design tokens, `app.css` for the surfaces |

## The streak rule

`calculateStreak(days, now)` in `src/lib/streak.ts` is the whole rule and depends on
nothing but its two arguments:

- a day counts once, however many times it was logged;
- the run is counted backwards a calendar day at a time and the first missing day ends it;
- it is anchored on today when today is marked, otherwise on yesterday, so a streak stays
  alive during the day it has not been marked off yet;
- miss both today and yesterday and it resets to zero.

Day boundaries are local. A habit marked at 23:58 belongs to that evening. Day arithmetic
runs over calendar components rather than elapsed hours, so a daylight-saving change can
neither add nor drop a day.

## Failure handling

Every storage read and write is wrapped and returns a result rather than throwing. Stored
JSON is validated on read: unreadable text, records in an older shape, entries pointing at
habits that no longer exist and days that are not real calendar days are all handled
explicitly. Failures are rendered into the page — an error panel when the ledger cannot be
opened, a warning strip when changes are no longer being saved — alongside an empty state
and a pending state.

## Tests

Six suites, ninety cases, run with `npm run test`. The streak rule is covered by
`src/lib/streak.test.ts` (consecutive days, gaps, first day, same-day double-logging,
future and malformed days) and `src/lib/streak.boundary.test.ts` (either side of local
midnight, and days that are not twenty-four hours long).
