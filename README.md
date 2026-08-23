# Dart Stats

Tracks your group's three games (Around the World, Cricket, 101/301/501) and
player stats. Built on the REST + React infrastructure template: Express +
MySQL backend, React + Vite frontend. No login, no accounts, just players by
name/initials, meant to run on your local network (one laptop for input at
the board, one screen for the viewer).

## Getting started

```bash
cd backend && cp .env.example .env   # fill in DB credentials
npm install
npm run dev                          # http://localhost:4000

cd ../frontend && cp .env.example .env
npm install
npm run dev                          # http://localhost:5173
```

Migrations run automatically on boot, so an empty MySQL database is enough.

On the input laptop, open `/atw`, `/cricket`, or `/x01` (linked from the
dashboard) to run a game. On the display screen, open the matching
`/atw/viewer`, `/cricket/viewer`, or `/x01/viewer` route, full screen. The
viewer polls the server every 2 seconds, no manual refresh needed.

## Structure

Same layered pattern as the template: `backend/src/endpoints/<area>/` holds
one `engine.ts` with the actual game rules plus thin endpoint handlers, and
`backend/src/config/routes.ts` wires it all up. There's no `x-api-key` or
auth layer since the brief explicitly ruled that out.

- `endpoints/players` - name/initials CRUD, no duplicates
- `endpoints/atw` - Around the World, the complex one, see below
- `endpoints/cricket` - Cricket
- `endpoints/x01` - 101/301/501
- `endpoints/stats` - per-player aggregates and comparison

## Rule interpretations

A few rules in the brief didn't have one unambiguous reading. Here's exactly
what got built, so you can tell me what to change:

**Around the World, mid-game join.** The new player's catch-up target is
the current position of whoever is furthest behind among active players.
They get consecutive turns (not waiting for normal rotation) until they
reach that number, then join the normal turn order.

**Around the World, win-streak bonus turns.** "Won twice in a row and
finishes a third game first... one extra turn more than just finishing" is
implemented as `extra turns = max(0, streak - 2)`, so a 3rd consecutive win
gives 1 bonus turn, a 4th gives 2, and so on. Those extra turns go to the
best-placed remaining active players (one extra turn each), to raise the
odds of a finale. If you meant something different by "won twice in a
row", this is the easiest piece to adjust, it's isolated to one block in
`endpoints/atw/engine.ts`.

**Around the World, finale ties.** The brief specifies 3 rounds, 1 arrow
each, highest total wins, but doesn't say what happens on a tie. The app
adds an automatic 4th (5th, 6th...) round for just the tied players until
someone's ahead.

**Around the World, finale target.** Rounds are just "enter this player's
score for this arrow" (0-180), not tied to a specific number, since the
brief didn't specify what the finale arrows are thrown at.

**Cricket give-out.** Once you've closed a number, hitting it again scores
you nothing. Instead, each opponent who hasn't closed that number yet takes
on the value as a penalty point (added to their own score). Lower score is
better, the aim is to close all seven numbers while taking on as few
points as possible. Win = closed all seven numbers while holding the sole
or tied lowest score.

**101/301/501.** Plain count-down, no double-out requirement, per "no weird
rules". Reaching exactly 0 wins, going below 0 busts the turn (remaining
score is unchanged, turn passes).

**Stats: "longest jump with triples/doubles".** Read as the biggest
single-turn advancement in Around the World (i.e. the turn where
catch-up-boosted doubles/triples moved someone the furthest in one go).

## Testing

`backend/src/scripts/smoketest.ts` is a dev-only script that exercises all
three engines end to end (rotation, bonus darts, catch-up, mid-game join,
finishing, finale with a tie, cricket give-out scoring, x01 bust/checkout,
stats aggregation) against a real database. It **wipes all data** in
whatever database it's pointed at first, so only run it against a throwaway
database, never your real one:

```bash
cd backend
npx ts-node --transpile-only src/scripts/smoketest.ts
```

## Known simplifications

- The finale's target/mechanic for the 3 rounds is generic "enter the
  score", not modeled as darts at a specific number.
- Manual turn-order changes in Around the World reorder whatever's
  currently queued; they don't retroactively change history.
- Deleting a player does not check whether they're part of an in-progress
  game (the foreign keys would block the delete with a database error,
  which surfaces as a generic failure rather than a friendly message).
