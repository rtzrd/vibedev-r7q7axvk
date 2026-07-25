# The Daily Ledger

A habit tracker that keeps its record in `localStorage`. No backend, no accounts.

```sh
npm install
npm run dev     # development server
npm run test    # unit tests
npm run build   # typecheck, then a bundle in dist/
```

`src/lib/streak.ts` holds the rule: `calculateStreak(days, now)` is pure and takes
its clock as an argument. A day counts once however often it was logged, the run
is counted backwards a calendar day at a time, and it stays anchored on yesterday
while today is still open. Day boundaries are local, and day arithmetic runs over
calendar components so a clock change cannot add or drop a day.

Storage wraps every read and write and returns results instead of throwing;
stored JSON is validated and older shapes are migrated on read. Failures render
into the page, alongside empty and pending states.
