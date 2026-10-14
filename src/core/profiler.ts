import type { Resultatformat, Spillprofil, Turnering } from './types'

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

/** «Annet»: generisk spill der arrangøren velger navnet selv (f.eks. bordtennis, Mario Kart). */
export const ANNET: Spillprofil = {
  id: 'annet',
  navn: 'Annet',
  ikon: 'ANNET',
  kategori: 'ANNET',
  tillatteDeltakertyper: ['LAG', 'SPILLER'],
  lagstorrelse: { min: 1, max: 20 },
  reserver: 0,
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
  sideNavn: { A: 'Side A', B: 'Side B' },
  malEnhet: 'poeng',
}

export const PROFILER: Spillprofil[] = [SJAKK, FOTBALL, ESPORT, ANNET]

export function hentProfil(id: string): Spillprofil {
  const p = PROFILER.find((x) => x.id === id)
  if (!p) throw new Error(`Ukjent spillprofil: ${id}`)
  return p
}

type Forhandsvalg = Pick<
  Spillprofil,
  'poeng' | 'walkoverResultat' | 'tiebreakers' | 'tiebreakersPerType' | 'tabellkolonner' | 'avgjoringsmetode' | 'uavgjortTillatt' | 'malEnhet'
>

const pick = (p: Spillprofil): Forhandsvalg => ({
  poeng: p.poeng,
  walkoverResultat: p.walkoverResultat,
  tiebreakers: p.tiebreakers,
  tiebreakersPerType: p.tiebreakersPerType,
  tabellkolonner: p.tabellkolonner,
  avgjoringsmetode: p.avgjoringsmetode,
  uavgjortTillatt: p.uavgjortTillatt,
  malEnhet: p.malEnhet,
})

/** Poeng, tiebreakere osv. for hvert resultatformat når admin velger regler for «Annet». */
const FORMAT_FORHANDSVALG: Record<Resultatformat, Forhandsvalg> = {
  MAL: pick(ANNET),
  SJAKK: { ...pick(SJAKK), malEnhet: 'poeng' },
  KART: pick(ESPORT),
}

/** Spillprofilen for en turnering. For «Annet» brukes navnet og reglene arrangøren har valgt. */
export function profilFor(t: Pick<Turnering, 'spillprofilId' | 'spillnavn' | 'spillregler'>): Spillprofil {
  const p = hentProfil(t.spillprofilId)
  if (p.id !== 'annet') return p
  const base = { ...p, navn: t.spillnavn?.trim() || p.navn }
  const r = t.spillregler
  if (!r) return base
  const valg = FORMAT_FORHANDSVALG[r.resultatformat]
  return {
    ...base,
    ...valg,
    resultatformat: r.resultatformat,
    uavgjortTillatt: r.resultatformat === 'MAL' ? (r.uavgjortTillatt ?? true) : valg.uavgjortTillatt,
    malEnhet: r.enhet?.trim() || valg.malEnhet,
  }
}
