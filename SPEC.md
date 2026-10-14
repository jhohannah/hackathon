# Nome Games AS – turneringssystem (spesifikasjon)

> **Time-boxed:** we have 2 hours and 5 people. PLAN.md overrides this spec on scope, tech and
> roles (frontend-only with localStorage, reduced tiebreakers, no Swiss playoffs). Use this spec
> for game rules, terminology and design.

## Context
We are a hackathon team acting as consultants for "Nome Games AS", a Norwegian company that
runs tournaments in physical sports (e.g. football), board games (e.g. chess) and e-sports.
The client wants a web application where you can create tournaments based on different
tournament formats, register participants, update the progress continuously as results come
in, see statistics and declare a winner.

All UI text is in Norwegian (bokmål). Code identifiers may mix Norwegian domain terms (as below)
with English.

The work is shown in a 5-minute presentation. A smooth, bug-free main flow matters more than
feature completeness. When in doubt, cut scope, not quality.

The client's procurement department is known for changing requirements without warning. So
everything that is a "rule" (points, tiebreakers, team size, number of rounds, best-of, walkover
score, Swiss limits) must be data/configuration, not code. A requirement change should usually
mean editing a profile or a tournament setting, not rewriting logic.

## Client requirements (from the case)
1. Påmelding (registration)
2. Turneringsoppsett (tournament formats): Cup, Liga, Alle mot alle, and Swiss stage
3. Poengsystem (scoring system), configurable per tournament
4. Kåre vinner (declare a winner)
5. Must be updated continuously; results come in during the tournament
6. Walkover: if a team/player doesn't show up, the one who did gets the points as if they won
7. Statistics
8. Games can be physical (football, chess) or e-sports, so both must be supported

## Demo script (acceptance criteria)
The following must work end-to-end without errors, on seeded data:
1. Open the overview → see 5+ tournaments with icons/badges, filter by game, see "Dagens kamper".
2. Open the chess cup → bracket with a finished armageddon match; register a result → the
   winner advances to the next round automatically.
3. Open the football league → table with +/- column, round tabs; register a walkover
   ("Forfall") → the team that showed up gets 3 points, the match is marked "w.o.".
4. Live update: with the tournament open in two browser windows, register a result in one →
   the other updates within ~5 seconds without a manual reload.
5. Open the e-sports Swiss stage → participants grouped by record (2–0, 1–1, 0–2 …) with
   "Videre"/"Ute" markers; finish the last match of the round → click "Generer neste runde"
   → new pairings within each record group, with no rematches.
6. Finish the last match of a tournament → status becomes "Avsluttet" and a winner banner
   (with a podium where it makes sense) is shown.
7. Open the Statistikk tab of a tournament and the global statistics page.
8. Admin: create a new tournament (game → type → participant type → scoring system;
   invalid combinations disabled), register participants, click "Generer kampoppsett"
   → schedule/bracket/round 1 appears.
9. Påmelding on a phone-sized screen: sign up a team and a 1v1 player.

## Scope priorities
- MUST: everything in the demo script, the four generators, both Swiss modes, the table with
  tiebreakers, result forms adapted per game, walkover, live updates, winner, basic
  statistics, scoring system per tournament, unit tests.
- SHOULD: playoffs after a Swiss stage, withdrawing a participant (all remaining matches
  become walkovers), responsive layout, correcting a result, filters, global statistics page.
- COULD (only if everything else is done): cup group stage, goal scorers and cards, top-scorer
  list, inviting players by e-mail (just store names/e-mails, no e-mail sending).
- OUT OF SCOPE: authentication, payments, real notifications, full FIDE Dutch-system pairing
  rules. Admin is just a route (/admin).

## Core idea
Three independent dimensions, freely combinable:
1. GAME (spillprofil): how a match is scored and how the table is ranked
2. TOURNAMENT TYPE: CUP | LIGA | ALLE_MOT_ALLE | SVEITSISK. Decides who plays whom and when
3. PARTICIPANT TYPE: LAG (team) | SPILLER (1 mot 1)

Tournament logic must never branch on a specific game id (no `if (game === 'SJAKK')`). All
game-specific behaviour comes from the profile. Adding a game = adding a profile object.

## 1. Game profiles
```ts
type Spillprofil = {
  id, navn, ikon,                           // ikon = key into an inline SVG icon map
  kategori: 'FYSISK' | 'BRETTSPILL' | 'ESPORT',
  tillatteDeltakertyper: ('LAG'|'SPILLER')[],
  lagstorrelse?: { min, max },              // team games only
  resultatformat: 'MAL' | 'SJAKK' | 'KART', // decides the form + display
  uavgjortTillatt: boolean,                 // in a cup a winner is always required
  avgjoringsmetode: 'EKSTRAOMGANGER_STRAFFER' | 'ARMAGEDDON' | 'INGEN',
  poeng: { seier, uavgjort, tap },          // default; can be overridden per tournament
  walkoverResultat: { vinner, taper },      // e.g. football 3–0, chess 1–0, e-sports 2–0 (bo3)
  tiebreakers: TiebreakerId[],              // ordered; "points" is always first
  tiebreakersPerType?: Partial<Record<Turneringstype, TiebreakerId[]>>, // overrides
  tabellkolonner: KolonneId[],              // which table columns to show
  statistikk: StatistikkId[],               // which statistics to show
  ekstraKampdata: FeltDefinisjon[]          // optional per-match fields (key, label, type)
}
```

Seed profiles:
- SJAKK (BRETTSPILL): SPILLER only. Result 1–0 / ½–½ / 0–1. Points 1 / ½ / 0. Walkover 1–0.
  Extra: colours (who has white). Tiebreakers: points → head-to-head → Sonneborn-Berger →
  number of wins → number of games with black.
  Swiss override: points → Buchholz Cut-1 → Buchholz → Sonneborn-Berger → number of wins.
  Cup draw → armageddon (register the winner only).
- FOTBALL (FYSISK): LAG only, team size per tournament (5, 7 or 11; profile allows 5–11 +
  reserves). Result in goals. Points 3 / 1 / 0. Walkover 3–0.
  Extra: home/away, (COULD) goal scorers, yellow/red cards.
  Tiebreakers: points → goal difference → goals scored → head-to-head.
  Swiss override: points → Buchholz → goal difference → goals scored.
  Cup draw → enter the score after extra time; if still level, enter the penalty score (e.g. 4–3),
  which decides the winner but does not count in the goal stats.
- E-SPORT (ESPORT; generic, display name "E-sport"): LAG or SPILLER. Result = maps won. Best-of
  (1/3/5) is set per tournament; only odd values, so no draws. Points 3 / 0 / 0. Walkover = the
  majority of the best-of (bo1 1–0, bo3 2–0, bo5 3–0).
  Tiebreakers: points → map difference → head-to-head.
  Swiss override: points → Buchholz → map difference.

Tiebreaker definitions (implement each as a small pure function
`(deltakerA, deltakerB, context) => number`):
- Head-to-head: if 2+ participants are tied, rank them by a mini-table built only from the
  matches between them. If still tied, move on to the next tiebreaker.
- Sonneborn-Berger: sum of the final points of every opponent you beat + half the final points
  of every opponent you drew with.
- Buchholz: sum of the final points of all opponents you have met (byes count as 0).
- Buchholz Cut-1: Buchholz minus the lowest single opponent score.
- If all tiebreakers are equal: sort alphabetically, so the order is deterministic.
- Byes give no points and do not count as played matches, except in SVEITSISK (see below).

## 2. Scoring system (poengsystem) per tournament
- The tournament wizard shows the profile's default points (win/draw/loss) and lets the admin
  change them (e.g. football 2/1/0 or chess 3/1/0). Stored as `poengOverstyring`.
- The tiebreaker order and the walkover score can also be adjusted (SHOULD), using a list of
  tiebreakers you can drag to reorder or move up/down.
- calculateTable always uses the tournament's effective scoring system (the override if set,
  otherwise the profile default).

## 3. Walkover (forfall)
- Every match has a "Forfall" (walkover) action in the result form: choose who showed up.
  Options: "A møtte ikke", "B møtte ikke", "Ingen møtte".
- The participant who showed up wins: they get poeng.seier, and the match is stored with the
  profile's walkoverResultat, `walkover: true`, status FERDIG.
- Walkover scores count in the table (as in real football rules), but are excluded from player
  statistics such as top scorers. They are shown as "w.o." in all views.
- Nobody showed up: both get a loss and 0 points. In a cup, neither advances, and the next
  opponent gets a walkover.
- Cup: the winner of a walkover advances like any other winner. Swiss: a walkover counts as a
  win (GRENSE mode +1 win, RUNDER mode the win points).
- (SHOULD) "Trekk deltaker" (withdraw participant): every remaining match for that participant
  becomes a walkover for the opponent; in Swiss, they are no longer paired.

## 4. Tournament types (every type must work with every game profile)
Generators are pure, deterministic functions that know nothing about games. They take
participant ids (+ options, + for Swiss a standings snapshot) and return matches. Randomness
uses a seedable RNG.

1. CUP: single elimination. Seeding: random or by rating, using standard bracket placement
   (1 vs N, 2 vs N-1, … so the top seeds can only meet late). If N is not a power of 2, the top
   seeds get byes in round 1. All rounds are generated up front with placeholders;
   `nesteKampId` + slot (A/B) links each match to the next. Finishing a match moves the winner
   on automatically; a draw is resolved by the profile's avgjoringsmetode.
   (COULD: group stage with round robin, top 2 go to the bracket.)
2. LIGA: double round robin (circle method, then the second half with sides swapped: home/away
   for football, white/black for chess). One round per `rundeintervall` days starting at
   `startdato`; every match gets a `tidspunkt`.
3. ALLE_MOT_ALLE: single round robin with the circle method, plus a bye when N is odd. All rounds
   on the same day, with times spaced by a match length set per tournament. For chess,
   alternate colours so nobody gets more than one extra white or black.
4. SVEITSISK (Swiss): rounds are generated one at a time, because pairings depend on earlier
   results. "Generer kampoppsett" creates round 1; "Generer neste runde" is enabled only when
   every match in the current round is FERDIG. Two modes, set per tournament:
   - RUNDER (classic, e.g. chess): fixed `antallRunder` (default ceil(log2 N)). Everyone plays
     every round. The final table (with the Swiss tiebreakers) decides the winner.
   - GRENSE (e-sports "Swiss stage"): a participant advances at `seireForVidere` wins
     (default 3) and is eliminated at `tapForUte` losses (default 3), and stops being paired
     after that. The stage ends when nobody is still active. Draws are not allowed and are
     resolved by the profile's avgjoringsmetode. Optional `sluttspillAntall` (e.g. 8): the
     participants who advance go on to a CUP bracket (phase SLUTTSPILL), seeded by Swiss
     standing (fewest losses first, then Buchholz).
   Pairing rules (simplified Dutch system; implement as `generateSwissRound`):
   - Round 1: seed by rating (or seedable random); top half meets bottom half (1 vs N/2+1 …).
   - Later rounds: group active participants by score (RUNDER) or by W–L record (GRENSE).
     Within a group, sort by tiebreak/rating and pair top half vs bottom half.
   - Never pair two participants who have already met. If that is impossible within a group,
     backtrack (try the next candidate). If a group has an odd count, the lowest-ranked player
     "floats down" to the next group.
   - Odd number of active participants: the lowest-ranked participant without a previous bye
     gets one. A Swiss bye counts as a win: `byePoeng` (default = poeng.seier) in RUNDER mode,
     and +1 win in GRENSE mode.
   - Side balance (white/black, home/away): give each participant the side they have had least;
     never the same colour three times in a row in chess.
   The generator gets a game-agnostic snapshot per participant:
   `{ id, poeng | seire/tap, rating, motstanderIds[], sidehistorikk[], hattBye }`.
   It must not import game profiles.

Status: KOMMER → PAMELDING_APEN → PAGAR (when the schedule or round 1 is generated) →
AVSLUTTET (when every match is FERDIG, and for Swiss, when the last round/playoff is done).
Correcting a result is allowed only while the dependent next match has not been played; for
Swiss, only while the next round has not been generated. The table is always recalculated
from matches, never stored.

## 5. Declaring the winner (kåre vinner)
- `determineWinner(turnering, kamper, tabell)` in /core returns `{ vinner, andre?, tredje? }`:
  - CUP: winner of the final, runner-up = loser of the final, 3rd = both semifinal losers
    ("delt 3. plass") unless a bronze match is configured (COULD).
  - LIGA / ALLE_MOT_ALLE / SVEITSISK RUNDER: places 1–3 in the final table.
  - SVEITSISK GRENSE: winner of the playoffs, or if there are no playoffs, everyone who
    advanced, listed as "Videre".
- When the tournament becomes AVSLUTTET: a winner banner at the top of the detail page (trophy
  SVG, name, game icon), a podium for places 1–3, and a "Vinner" badge on the overview card.
- While a league is ongoing: show "Leder" (current leader) in the table, and "Seriemester"
  once the leader can no longer be caught (SHOULD).

## 6. Live updates
- The detail page, "Dagens kamper" and the overview refetch automatically (polling every
  5 seconds, e.g. TanStack Query `refetchInterval`), or use Server-Sent Events if it is simple
  to do. Pause polling when the tab is hidden.
- Show "Sist oppdatert hh:mm:ss" and briefly highlight rows/matches that just changed.
- Matches can be set to PAGAR ("Pågår nå") so the overview shows live matches.

## 7. Statistics
- `calculateStatistics(kamper, deltakere, profil)` in /core; what is shown comes from
  `profil.statistikk`.
- Statistikk tab per tournament: matches played / remaining, total and average goals/maps per
  match, biggest win, number of walkovers, draw percentage, form for the last 5 matches
  per participant (S/U/T chips), longest winning streak.
  Chess: score with white vs black. Football: clean sheets. E-sports: map win %.
- (SHOULD) Global /statistikk page: per participant across tournaments: tournaments played,
  matches, wins/draws/losses, win %, titles won. Filter by game.
- (COULD) Top-scorer list for football (needs goal scorers) and simple bar charts.

## 8. Participants
- Spiller { id, navn, gamertag?, epost?, rating? }  (rating = Elo for chess)
- Lag { id, navn, kapteinId, spillerIds[] }  (size validated against lagstorrelse)
- Deltaker { id, turneringId, type: LAG|SPILLER, refId, visningsnavn, rating?, trukket: boolean }
  This is the only thing the tournament logic sees, so teams and players are handled identically.
- Registration validates: allowed participant type for the game, tournament status is
  PAMELDING_APEN, maksDeltakere not reached, team size within limits, no duplicate names.
  Errors are shown in Norwegian next to the field.

## 9. Other entities
- Turnering { id, navn, spillprofilId, type, deltakertype, status, maksDeltakere, startdato,
  rundeintervall?, bestOf?, lagstorrelse?, poengOverstyring?, tiebreakerOverstyring?,
  sted?, sveitsisk?: { modus: 'RUNDER'|'GRENSE', antallRunder?, seireForVidere?, tapForUte?,
  byePoeng?, sluttspillAntall? }, oppdatert }
- Kamp { id, turneringId, fase: 'HOVED'|'SLUTTSPILL', runde, deltakerAId?, deltakerBId?,
  resultatA?, resultatB?, avgjoring? { metode, A?, B?, vinnerId }, vinnerId?,
  walkover: boolean, erBye: boolean, tidspunkt, bane?, status: PLANLAGT|PAGAR|FERDIG,
  nesteKampId?, nesteKampSlot?, ekstra: JSON, oppdatert }

## 10. Screens
1. Turneringsoversikt (overview): cards with game icon, status badge, tournament type,
   participant type and the winner if finished. Filters for game, type and status.
   Sections: "Pågår nå" (live matches) and "Dagens kamper" (today's matches).
2. Tournament detail with tabs "Oversikt" / "Kamper" / "Tabell" / "Statistikk", where the main
   view depends on the type:
   - CUP: bracket, rounds as columns, winner highlighted, loser dimmed, decider shown in small
     text ("4–3 e.str." for penalties, "Armageddon" for chess, "w.o."). Scrolls horizontally
     on mobile.
   - LIGA: table + round schedule with one tab per round.
   - ALLE_MOT_ALLE: table + result matrix.
   - SVEITSISK: round tabs with pairings + standings. RUNDER mode: a table with points,
     Buchholz and the profile's columns. GRENSE mode: columns per round with participants
     grouped by record (e.g. "2–0", "1–1", "0–2"), green "Videre" and grey "Ute" markers,
     then the playoff bracket below if configured. "Runde X av Y" indicator.
   - Table columns come from the profile's tabellkolonner (football +/-, chess ½-points and
     SB/Buchholz, e-sports map difference). The scoring system in use is shown under the table
     (e.g. "Seier 3 · Uavgjort 1 · Tap 0").
   - Winner banner + podium when the tournament is AVSLUTTET.
3. Register result: a modal or page driven by resultatformat. MAL: two number fields
   (+ penalties if cup/GRENSE and level). SJAKK: three large buttons 1–0 / ½–½ / 0–1
   (+ armageddon winner if cup/GRENSE and draw). KART: map score, validated against best-of.
   Always a "Forfall" button for walkovers. "Start kamp" sets the match to PAGAR.
   Large tap targets on mobile.
4. Påmelding (registration): choose a tournament; show the "Lag" and/or "1 mot 1" option based
   on the profile. Team: name, captain, players. 1v1: name/gamertag (+ rating).
5. Admin: create a tournament (wizard: game → type → participant type → settings → scoring
   system; invalid options disabled with an explanation; for Swiss also choose the mode and its
   settings), list participants, "Trekk deltaker", "Generer kampoppsett" (disabled with fewer
   than 2 participants), "Generer neste runde" for Swiss, register and correct results,
   "Tilbakestill demodata" (reset demo data).
6. Statistikk: the global statistics page (SHOULD).

## Tech (fixed, do not substitute)
- npm workspaces monorepo: /web (Vite + React + TypeScript + React Router + TanStack Query),
  /server (Node + Express + TypeScript, better-sqlite3), /core (pure TS, no I/O).
- /core contains: types, profiles, generators (generateCupBracket, generateLeagueSchedule,
  generateRoundRobin, generateSwissRound), rules (registerResult(kamp, input, profil) → updated
  Kamp or a validation error; registerWalkover; calculateTable(kamper, deltakere, profil,
  turnering)), swissSnapshot, determineWinner, calculateStatistics, and tiebreakers.
  Both server and web import types from /core.
- REST API (JSON):
  GET/POST /turneringer, GET /turneringer/:id (incl. matches, table, winner),
  GET /turneringer/:id/statistikk, POST /turneringer/:id/deltakere,
  DELETE /turneringer/:id/deltakere/:deltakerId (withdraw), POST /turneringer/:id/generer,
  POST /turneringer/:id/neste-runde, PUT /kamper/:id/resultat, PUT /kamper/:id/walkover,
  PUT /kamper/:id/status, GET /kamper/i-dag, GET /statistikk, GET /spillprofiler,
  POST /admin/reset.
  Optional: GET /turneringer/:id/oppdatert returning a timestamp for cheap polling.
  The server validates through /core; errors are returned as `{ feil: string }` in Norwegian.
- Vitest unit tests in /core covering at least:
  - cup with 8, 6 and 5 participants (correct byes, seeding order, winner advancing)
  - circle method with even and odd N (everyone meets everyone exactly once; correct number
    of rounds; byes; fair colour distribution)
  - double round robin (each pair meets twice with sides swapped)
  - Swiss RUNDER: 8 players × 5 rounds and 9 players × 4 rounds with simulated results →
    no rematches, pairs within the same score group where possible, no repeated byes,
    no colour three times in a row
  - Swiss GRENSE: 16 teams with 3/3 → at most 5 rounds, exactly 8 advance and 8 are out,
    nobody paired after reaching a limit, pairs only within the same record
  - Buchholz and Buchholz Cut-1; a Swiss table where Buchholz decides
  - chess table where Sonneborn-Berger decides; football table where goal difference decides
    and one where 3-way head-to-head decides
  - cup draw resolved by penalties and by armageddon
  - walkover: correct points and score, winner advances in a cup, "nobody showed up" case
  - custom scoring system (e.g. 2/1/0) changes the table order
  - determineWinner for every tournament type
- Commands: `npm install`, `npm run dev` (starts server + web, auto-seeds if the DB is
  empty), `npm test`, `npm run typecheck`, `npm run seed` (reset).

## Seed data (dates relative to today, so "Dagens kamper" is never empty)
- Chess cup, 8 players with Elo ratings, seeded by rating; quarterfinals done (one decided by
  armageddon), semifinals today.
- Football league, 6 teams (7-a-side), weekly rounds; 3 of 10 rounds played, including a
  walkover and a tie on points that goal difference decides; round 4 is today, one match PAGAR.
- E-sports round robin, 5 participants (odd → bye), best of 3, half the matches played,
  the rest later today.
- E-sports Swiss stage (GRENSE, 3 wins / 3 losses, best of 1, top 8 to a best-of-3 playoff),
  16 teams; rounds 1–2 done, round 3 today with all but one match finished, so the demo can
  finish it and generate round 4.
- Chess Swiss (RUNDER, 10 players, 5 rounds) with 3 rounds played.
- One finished tournament (e.g. a 5-a-side football cup) with a winner banner and podium.
- One tournament with status PAMELDING_APEN for the registration demo.
- Realistic Norwegian names and team names (e.g. "Tromsø Tigers").

## Design
- Light theme: background #F5F6FA, white cards (border #E4E6EE, radius 16px), text #16182A,
  secondary text #5D6275.
- Primary #5B3DF5 (buttons, active states); dark purple #2A1B5C for headings and the hero banner.
- Status badges: Pågår #FFE8DC / #A63D0A, Påmelding åpen #DDF6E8 / #146C3E,
  Kommer and Avsluttet #EEF0F5 / #3D4256.
- Swiss markers: Videre #DDF6E8 / #146C3E, Ute #EEF0F5 / #3D4256. Walkover tag "w.o." in grey.
- Winner banner on #2A1B5C with a gold accent (#F5B800) for the trophy and 1st place.
- Inline SVG icon per game and a trophy SVG (no emoji, no icon library needed).
- Fonts via Google Fonts: "Barlow Condensed" (headings), "IBM Plex Sans" (body).
- Responsive down to 375px wide; registration and result entry must be comfortable on a phone.
- Use plain CSS or CSS modules with CSS variables for the colours; no UI framework.

## Team workflow
- The case requires every team member to contribute to every role, including coding. Split the
  work into four workstreams with a clear contract (the types in /core/src/types.ts and the
  API list above), so people can work in parallel:
  A. /core logic + tests  B. /server API + seed  C. /web views (overview, detail, bracket,
  tables, statistics, winner)  D. /web forms (registration, result/walkover, admin wizard)
- Each person takes one main workstream and pairs on another, and everyone also takes part in
  the presentation (problem → solution → live demo → architecture → what's next).
- Use Opus for planning (PLAN.md) and Sonnet for carrying out the individual tasks.

## Work order and checkpoints
1. /core: types, profiles, generators (Swiss last, since it is the hardest), rules,
   walkover, tiebreakers, winner, statistics + tests → `npm test` all green.
2. /server: schema, seed, API → verify with a few curl calls.
3. /web: overview → detail views → result/walkover form → live updates → winner →
   statistics → registration → admin.
4. Walk through the demo script yourself and fix anything that breaks.
Do not move on to the next step while tests or the typecheck are failing.

## Deliverables
- A README with setup and run commands, a short architecture overview (the three dimensions,
  the four tournament types, the game-agnostic generators, how /core is isolated), how to add
  a new game profile, and how to change the scoring system.
- At the end, a short summary: what works, what was cut (by priority tier), known limitations.
