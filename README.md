# Nome Games AS – turneringssystem

Repo for WIC-NTNU Hackathon 2026. Webapp for å opprette turneringer (cup, liga, alle mot alle og
Swiss stage), melde på deltakere, registrere resultater fortløpende og kåre vinner.
Se [SPEC.md](SPEC.md) for krav og [PLAN.md](PLAN.md) for tidsplan og roller.

## Kjør prosjektet

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # enhetstester (generatorer, regler, demodata, store)
npm run typecheck
npm run build
```

Appen er ren frontend (React + TypeScript + Vite). Data lagres i `localStorage`, og demodata
genereres første gang. Åpne appen i to faner: et resultat registrert i den ene dukker opp i den
andre med en gang. «Tilbakestill demodata» finnes under **Admin**.

## Struktur

```
src/core/            ren logikk, ingen UI – kan flyttes rett til en backend
  profiler.ts        spillprofiler (sjakk, fotball, e-sport) – alle spillregler som data
  generatorer/       cup, alle mot alle / liga (sirkelmetoden), sveitsisk runde – kjenner ingen spill
  regler/            resultat + walkover, tabell + tiebreakers, vinner, status, statistikk, påmelding
src/seed.ts          demodata (datoer relativt til i dag)
src/store.ts         Zustand-store med persist + synk mellom faner
src/pages, components   skjermene
```

Tre uavhengige dimensjoner kan kombineres fritt: **spill** (profil), **turneringstype** og
**deltakertype** (lag / 1 mot 1). Turneringslogikken forgrener seg aldri på spill-id; alt
spillspesifikt kommer fra profilen.

## Legge til et nytt spill

Legg til et objekt i `src/core/profiler.ts` og ta det med i `PROFILER`. Poeng, tiebreakers,
resultatformat, uavgjort-regler, walkover-score og tabellkolonner er alle felt i profilen.
Trenger spillet et nytt resultatformat, legg det til i `registrerResultat` og `ResultatSkjema`.

## Endre poengsystem

Per turnering i Admin-veiviseren (steg 4), eller i koden via `Turnering.poengOverstyring`.
Tabellen regnes alltid ut fra kampene med det gjeldende poengsystemet.

## Kjente begrensninger

- Ingen backend eller innlogging – admin er bare ruten `/admin`.
- «Ingen møtte» (walkover for begge) er ikke lov i cup og Swiss stage (GRENSE).
- Swiss stage har ikke sluttspill etter svitsisk runde ennå.
- Ikke implementert: gruppespill før cup, målscorere/kort, global statistikkside, trekke deltaker underveis.
