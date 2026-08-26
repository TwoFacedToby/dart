# Dart Stats

Tracks Around the World, Cricket, and 101/301/501 for the group, plus
stats per player. Express + MySQL backend, React + Vite frontend. No user
accounts, players are just a name and initials, and the whole thing runs
on the local network, one laptop for scoring at the board, one screen
mounted nearby for the live view.

The site sits behind a single shared key. There's an input field on first
load, the correct key gets stored in the browser and sent on every request
after that, wrong or missing keys get rate-limited. Not meant to keep
anyone out who's actually been given the key, just meant to keep the app
off search engines and randos.

## Running it

```bash
cd backend && cp .env.example .env   # fill in DB credentials and the access key
npm install
npm run dev                          # http://localhost:4000

cd ../frontend && cp .env.example .env
npm install
npm run dev                          # http://localhost:5173
```

Migrations run on boot, so an empty MySQL database is enough to start.

The sidebar covers everything: add players, start a game, check stats,
look back at old games, or open the second-screen view. Two viewers exist
right now, `/view` (the original) and `/new-view` (built for the portrait
display upstairs, light background, bigger text, no zoom). `/new-view`
only has Around the World designed so far, Cricket and 101/301/501 there
are still placeholders.

## Structure

`backend/src/endpoints/<game>/` holds an `engine.ts` with the actual rules
plus thin endpoint handlers, `backend/src/config/routes.ts` wires it all
up. Frontend mirrors it, one folder per game under `frontend/src/pages/`.

- `endpoints/players` - name/initials, no duplicates
- `endpoints/atw` - Around the World, the complicated one
- `endpoints/cricket` - Cricket
- `endpoints/x01` - 101/301/501
- `endpoints/stats` - per-player and per-game-type aggregates, comparisons,
  totals
- `endpoints/auth` - the shared-key check

## How the games work

**Around the World.** Numbers 1 through 20 in order, hit the one aiming
for to advance, three darts a turn and a bonus dart if all three land.
Reaching 20 doesn't finish it, only actually hitting 20 does, catch-up can
carry the count right up to 20 but never past it. Fall five or more behind
the leader and doubles/triples count in full for that turn instead of
just one. Someone finishing doesn't end the game outright, whoever hasn't
had their turn yet this round still gets it. A win streak earns bonus
rounds for everyone still in it, one extra full round per win beyond the
first repeat, so beating someone on a streak takes catching them across
more than one shot at it. Joining partway through starts a new player at
whatever number the furthest-behind player is on, with consecutive turns
until they're caught up, then normal rotation.

**Cricket.** Fifteen through twenty and bull, three marks closes a number.
Closed numbers score against anyone still open on that number. Lower
total wins. Closing all seven first secures first place but doesn't end
the game, the rest keep playing until someone closes out second too.

**101/301/501.** Straight countdown, no double-out. Reaching zero exactly
wins, going under busts the turn and nothing changes.
