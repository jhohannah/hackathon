import type { Deltaker, Kamp, Spillprofil, Svar, Turnering } from '../types'
import {
  genererSveitsiskRunde,
  type SveitsiskDeltaker,
} from '../generatorer/sveitsisk'
import { beregnTabell } from './tabell'

export function sveitsiskInnstillinger(t: Turnering, antallDeltakere: number) {
  const s = t.sveitsisk ?? { modus: 'RUNDER' as const }
  return {
    modus: s.modus,
    antallRunder:
      s.antallRunder ?? Math.max(1, Math.ceil(Math.log2(Math.max(2, antallDeltakere)))),
    seireForVidere: s.seireForVidere ?? 3,
    tapForUte: s.tapForUte ?? 3,
  }
}

/** Maks antall runder i en GRENSE-modus: (videre + ute − 1). */
export function maksRunder(t: Turnering, antallDeltakere: number): number {
  const s = sveitsiskInnstillinger(t, antallDeltakere)
  return s.modus === 'RUNDER' ? s.antallRunder : s.seireForVidere + s.tapForUte - 1
}

export function sveitsiskSnapshot(
  kamper: Kamp[],
  deltakere: Deltaker[],
  profil: Spillprofil,
  turnering: Turnering,
): SveitsiskDeltaker[] {
  const s = sveitsiskInnstillinger(turnering, deltakere.length)
  const tabell = beregnTabell(kamper, deltakere, profil, turnering)
  const rad = new Map(tabell.map((r) => [r.deltakerId, r]))
  const sortert = [...kamper].sort((a, b) => a.runde - b.runde)
  return deltakere.map((d) => {
    const r = rad.get(d.id)
    const seire = r?.seire ?? 0
    const tap = r?.tap ?? 0
    const mine = sortert.filter((k) => k.deltakerAId === d.id || k.deltakerBId === d.id)
    return {
      id: d.id,
      poeng: r?.poeng ?? 0,
      seire,
      tap,
      rating: d.rating ?? 0,
      motstanderIds: mine
        .filter((k) => !k.erBye)
        .map((k) => (k.deltakerAId === d.id ? k.deltakerBId! : k.deltakerAId!)),
      sidehistorikk: mine.filter((k) => !k.erBye).map((k) => (k.deltakerAId === d.id ? 'A' : 'B')),
      hattBye: mine.some((k) => k.erBye),
      aktiv:
        s.modus === 'RUNDER' ? true : seire < s.seireForVidere && tap < s.tapForUte,
    }
  })
}

export function antallAktive(
  kamper: Kamp[],
  deltakere: Deltaker[],
  profil: Spillprofil,
  turnering: Turnering,
): number {
  return sveitsiskSnapshot(kamper, deltakere, profil, turnering).filter((d) => d.aktiv).length
}

/** Genererer neste sveitsiske runde (eller runde 1 når det ikke finnes kamper). */
export function genererNesteRunde(
  turnering: Turnering,
  deltakere: Deltaker[],
  kamper: Kamp[],
  profil: Spillprofil,
  tidspunkt: string,
): Svar {
  if (turnering.type !== 'SVEITSISK') return { ok: false, feil: 'Dette er ikke en sveitsisk turnering.' }
  if (deltakere.length < 2) return { ok: false, feil: 'Minst 2 deltakere trengs.' }
  if (kamper.some((k) => k.status !== 'FERDIG')) {
    return { ok: false, feil: 'Alle kamper i runden må være ferdige først.' }
  }
  const s = sveitsiskInnstillinger(turnering, deltakere.length)
  const runde = kamper.reduce((m, k) => Math.max(m, k.runde), 0) + 1
  if (s.modus === 'RUNDER' && runde > s.antallRunder) {
    return { ok: false, feil: 'Alle rundene er spilt.' }
  }
  const snapshot = sveitsiskSnapshot(kamper, deltakere, profil, turnering)
  if (!snapshot.some((d) => d.aktiv)) return { ok: false, feil: 'Ingen aktive deltakere igjen.' }
  const nye = genererSveitsiskRunde(snapshot, runde, {
    turneringId: turnering.id,
    modus: s.modus,
    tidspunkt,
    seed: 11,
  })
  return { ok: true, kamper: nye }
}
