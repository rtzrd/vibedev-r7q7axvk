# The Daily Ledger

Habit tracker kept in `localStorage`. No backend, no accounts.

`npm install` · `npm run dev` · `npm run test` · `npm run build`

The rule lives in `src/lib/streak.ts`: `calculateStreak(days, now)` is pure and
takes its clock as an argument. Day boundaries are local; day arithmetic runs
over calendar components so a clock change cannot add or drop a day.
