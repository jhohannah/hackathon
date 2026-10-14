import type { Spillprofil } from './types'

// Alle spillregler ligger her som data. Nytt spill = ny profil i listen.

export const SJAKK: Spillprofil = {
  id: 'sjakk',
  navn: 'Sjakk',
  ikon: 'SJAKK',
  kategori: 'BRETTSPILL',
  tillatteDeltakertyper: ['SPILLER'],
  resultatformat: 'SJAKK',
  uavgjortTillatt: true,
  avgjoringsmetode: 'ARMAGEDDON',
  poeng: { seier: 1, uavgjort: 0.5, tap: 0 },
  walkoverResultat: { vinner: 1, taper: 0 },
  tiebreakers: ['INNBYRDES', 'SB', 'SEIRE', 'SVART'],
  tiebreakersPerType: {
    SVEITSISK: ['BUCHHOLZ_CUT1', 'BUCHHOLZ', 'SB', 'SEIRE'],
  },
  tabellkolonner: ['S', 'V', 'U', 'T', 'P', 'SB'],
  sideNavn: { A: 'Hvit', B: 'Svart' },
  malEnhet: 'poeng',
}

export const FOTBALL: Spillprofil = {
  id: 'fotball',
  navn: 'Fotball',
  ikon: 'FOTBALL',
  kategori: 'FYSISK',
  tillatteDeltakertyper: ['LAG'],
  lagstorrelse: { min: 5, max: 11 },
  reserver: 3,
  resultatformat: 'MAL',
  uavgjortTillatt: true,
  avgjoringsmetode: 'EKSTRAOMGANGER_STRAFFER',
  poeng: { seier: 3, uavgjort: 1, tap: 0 },
  walkoverResultat: { vinner: 3, taper: 0 },
  tiebreakers: ['DIFF', 'SCORET', 'INNBYRDES'],
  tiebreakersPerType: {
    SVEITSISK: ['BUCHHOLZ', 'DIFF', 'SCORET'],
  },
  tabellkolonner: ['S', 'V', 'U', 'T', 'MAL', 'DIFF', 'P'],
  sideNavn: { A: 'Hjemme', B: 'Borte' },
  malEnhet: 'mål',
}

export const ESPORT: Spillprofil = {
  id: 'esport',
  navn: 'E-sport',
  ikon: 'ESPORT',
  kategori: 'ESPORT',
  tillatteDeltakertyper: ['LAG', 'SPILLER'],
  lagstorrelse: { min: 1, max: 7 },
  reserver: 2,
  resultatformat: 'KART',
  uavgjortTillatt: false,
  avgjoringsmetode: 'INGEN',
  poeng: { seier: 3, uavgjort: 0, tap: 0 },
  walkoverResultat: { vinner: 1, taper: 0 }, // erstattes av flertallet i best-of
  tiebreakers: ['DIFF', 'INNBYRDES'],
  tiebreakersPerType: {
    SVEITSISK: ['BUCHHOLZ', 'DIFF'],
  },
  tabellkolonner: ['S', 'V', 'T', 'MAL', 'DIFF', 'P'],
  sideNavn: { A: 'Side A', B: 'Side B' },
  malEnhet: 'kart',
}

export const PROFILER: Spillprofil[] = [SJAKK, FOTBALL, ESPORT]

export function hentProfil(id: string): Spillprofil {
  const p = PROFILER.find((x) => x.id === id)
  if (!p) throw new Error(`Ukjent spillprofil: ${id}`)
  return p
}
