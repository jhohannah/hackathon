# PLAN – 2 timer, 5 personer

Denne planen overstyrer SPEC.md når det gjelder omfang og teknologi. SPEC.md gjelder fortsatt
for spillregler, begreper og design.

## Tidsplan (nå 09:36 → ferdig 11:36)
| Tid | Hva |
|---|---|
| 09:36–09:50 | P1 lager skjelettet og pusher. De andre leser SPEC/PLAN og starter på egne filer mot stubbene under. |
| 09:50–10:55 | Bygging i parallell. Merge til `main` minst hvert 20. min. |
| 10:55–11:10 | Integrasjon: kjør demomanuset, fiks bare feil (ingen nye funksjoner). |
| 11:10 | **Kodefrys.** |
| 11:10–11:30 | Presentasjon: lag slides ferdig, øv to ganger med tidtaker (5 min). |
| 11:30–11:36 | Buffer. |

## Kutt for å rekke det (viktigst først)
- **Ingen backend.** Ren Vite + React + TypeScript-app. Data lagres i `localStorage` via en
  Zustand-store med `persist`. Live-oppdatering = lytter på `storage`-eventet, så to faner
  i samme nettleser oppdaterer hverandre umiddelbart. (Si i presentasjonen at neste steg er
  et REST-API + database; `core/` er allerede uavhengig av UI og kan flyttes rett over.)
- Sveitsisk: én parringsalgoritme (grupper på poeng, ingen omkamper, bye til lavest rangerte).
  Modus GRENSE (3 seire videre / 3 tap ute) er bare et filter oppå. Ingen sluttspill.
- Tiebreakers: poeng → målforskjell/kartforskjell → innbyrdes (bare 2 like) → antall seire
  → alfabetisk. Sonneborn-Berger og Buchholz bare hvis P1 har tid.
- Kuttet helt: korrigering av resultat, trekk deltaker, global statistikkside, målscorere/kort,
  gruppespill i cup, e-postinvitasjon, hvit/svart-balansering (vis bare farge).
- Tester: bare Vitest for generatorene og tabellen (P2 og P1, maks 10 min hver).

## Demomanus (må virke 11:10)
1. Oversikt med 4 turneringer, filter på spill, "Dagens kamper".
2. Sjakkcup: registrer resultat → vinneren går videre i braketten.
3. Fotball-liga: registrer forfall (w.o.) → tabellen oppdateres. Vis det i to faner side om side.
4. E-sport Swiss stage: fullfør runden → "Generer neste runde" → nye parringer, "Videre"/"Ute".
5. Admin: opprett turnering (spill → type → deltakertype → poengsystem), meld på, generer oppsett.
6. Fullfør en turnering → vinnerbanner med pallen.

## Roller (eier = eneste som endrer filene; alle koder)
| Person | Ansvar | Filer | Presentasjon |
|---|---|---|---|
| **P1 Kjerne** | Skjelett (Vite, router, Zustand, fonter, CSS-variabler), `types.ts`, spillprofiler, `beregnTabell`, tiebreakers, `registrerResultat`, `registrerWalkover`, `kaarVinner`, `beregnStatistikk` + tester | `src/core/types.ts`, `profiler.ts`, `regler/*` | Arkitektur (30 s) |
| **P2 Generatorer** | `genererCup` (byes, seeding, `nesteKampId`), `genererAlleMotAlle` (sirkelmetoden), `genererLiga` (dobbel), `genererSveitsiskRunde` + tester | `src/core/generatorer/*` | Turneringsformatene (60 s) |
| **P3 Data + oversikt** | Store-actions, seed-data (4 turneringer, datoer relativt til i dag), `storage`-synk, layout/nav, oversiktsside med kort, filter, statusmerker, "Dagens kamper" | `src/store.ts`, `src/seed.ts`, `src/App.tsx`, `src/pages/Oversikt.tsx` | Problemet + kunden (45 s) |
| **P4 Visninger** | Turneringsdetalj: brakett, tabell, rundefaner, resultatmatrise, sveitsisk visning gruppert på rekord, vinnerbanner + pall, statistikk-fane | `src/pages/Turnering.tsx`, `src/components/{Brakett,Tabell,Runder,Matrise,Sveitsisk,Vinner,Statistikk}.tsx` | Kjører live-demoen |
| **P5 Skjemaer + presentasjon** | Resultatskjema (MAL / SJAKK / KART + Forfall-knapp), påmelding (lag / 1 mot 1), admin-veiviser + "Generer"-knapper. Fra 10:40: slides | `src/components/ResultatSkjema.tsx`, `src/pages/{Pamelding,Admin}.tsx`, `slides/` | Leder presentasjonen, avslutning (45 s) |

Par for hjelp: P1↔P2 (kjerne), P3↔P4 (visning), P5 får hjelp av den som blir ferdig først.

## Kontrakt (skrives av P1 innen 09:50; alle andre koder mot dette)
```ts
// src/core/types.ts – se SPEC.md §1, §8, §9 for feltene
export type Deltakertype = 'LAG' | 'SPILLER'
export type Turneringstype = 'CUP' | 'LIGA' | 'ALLE_MOT_ALLE' | 'SVEITSISK'
export type Status = 'KOMMER' | 'PAMELDING_APEN' | 'PAGAR' | 'AVSLUTTET'

// Generatorer (P2) – vet ingenting om spill
genererCup(deltakerIds: string[], opts: { seed?: number; rating?: Record<string, number> }): Kamp[]
genererAlleMotAlle(deltakerIds: string[], opts: { start: string; minutterPerKamp: number }): Kamp[]
genererLiga(deltakerIds: string[], opts: { start: string; dagerMellomRunder: number }): Kamp[]
genererSveitsiskRunde(snapshot: SveitsiskDeltaker[], runde: number): Kamp[]

// Regler (P1)
registrerResultat(kamp: Kamp, input: ResultatInput, profil: Spillprofil, alleKamper: Kamp[]): Kamp[] // returnerer endrede kamper (inkl. neste cupkamp)
registrerWalkover(kamp: Kamp, moette: 'A' | 'B' | 'INGEN', profil: Spillprofil, alleKamper: Kamp[]): Kamp[]
beregnTabell(kamper: Kamp[], deltakere: Deltaker[], profil: Spillprofil, turnering: Turnering): Tabellrad[]
kaarVinner(turnering: Turnering, kamper: Kamp[], tabell: Tabellrad[]): { vinner?: string; andre?: string; tredje?: string[] }
beregnStatistikk(kamper: Kamp[], deltakere: Deltaker[], profil: Spillprofil): Statistikk

// Store (P3) – det eneste UI-et kaller
useStore(): { turneringer, deltakere, kamper,
  opprettTurnering, meldPa, genererOppsett, nesteRunde,
  lagreResultat, lagreWalkover, settKampStatus, nullstill }
```
Til 09:50: P2–P5 bruker midlertidige stubber som returnerer hardkodede data, så ingen venter.

## Git-regler
- Én gren per person (`p1-kjerne` …), merge til `main` ofte. Bare eieren endrer sine filer.
- `App.tsx` (ruter) og `types.ts` eies av henholdsvis P3 og P1; be dem om endringer.
- Før hver merge: `npm run build` må gå gjennom.

## Prompt per oppgave (Sonnet)
```
Les SPEC.md og PLAN.md. Jeg er [P1–P5]. Lag [oppgave] i bare mine filer, mot kontrakten i PLAN.md.
Ikke endre types.ts eller andres filer. Kjør `npm run build` (og `npm test` for core) før du er ferdig.
```
