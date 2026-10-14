import type {
  Deltaker,
  Kamp,
  KolonneId,
  Poeng,
  Spillprofil,
  Tabellrad,
  TiebreakerId,
  Turnering,
} from '../types'
import { rangerMedTiebreakers } from './tiebreakers'

export function effektivPoeng(t: Turnering, p: Spillprofil): Poeng {
  return t.poengOverstyring ?? p.poeng
}

export function effektiveTiebreakers(t: Turnering, p: Spillprofil): TiebreakerId[] {
  return p.tiebreakersPerType?.[t.type] ?? p.tiebreakers
}

export function tabellkolonner(t: Turnering, p: Spillprofil): KolonneId[] {
  const kol = [...p.tabellkolonner]
  if (t.type === 'SVEITSISK' && !kol.includes('BH')) kol.push('BH')
  return kol
}

/** Tabellen regnes alltid ut fra kampene, aldri lagret. */
export function beregnTabell(
  kamper: Kamp[],
  deltakere: Deltaker[],
  profil: Spillprofil,
  turnering: Turnering,
): Tabellrad[] {
  const p = effektivPoeng(turnering, profil)
  const rader = new Map<string, Tabellrad>()
  for (const d of deltakere) {
    rader.set(d.id, {
      deltakerId: d.id,
      navn: d.visningsnavn,
      spilt: 0,
      seire: 0,
      uavgjort: 0,
      tap: 0,
      malFor: 0,
      malMot: 0,
      diff: 0,
      poeng: 0,
      sb: 0,
      bh: 0,
      bh1: 0,
      svart: 0,
      plass: 0,
    })
  }
  const ferdige = kamper.filter((k) => k.status === 'FERDIG')

  for (const k of ferdige) {
    if (k.erBye) {
      // Bye teller bare i sveitsisk (som en seier).
      if (k.vinnerId && turnering.type === 'SVEITSISK') {
        const r = rader.get(k.vinnerId)
        if (r) {
          r.spilt++
          r.seire++
          r.poeng += turnering.sveitsisk?.byePoeng ?? p.seier
        }
      }
      continue
    }
    const a = k.deltakerAId ? rader.get(k.deltakerAId) : undefined
    const b = k.deltakerBId ? rader.get(k.deltakerBId) : undefined
    if (!a || !b) continue
    const ra = k.resultatA ?? 0
    const rb = k.resultatB ?? 0
    a.spilt++
    b.spilt++
    a.malFor += ra
    a.malMot += rb
    b.malFor += rb
    b.malMot += ra
    b.svart++
    if (k.vinnerId === a.deltakerId) {
      a.seire++
      a.poeng += p.seier
      b.tap++
      b.poeng += p.tap
    } else if (k.vinnerId === b.deltakerId) {
      b.seire++
      b.poeng += p.seier
      a.tap++
      a.poeng += p.tap
    } else if (k.walkover) {
      // Ingen møtte: begge tapte.
      a.tap++
      b.tap++
      a.poeng += p.tap
      b.poeng += p.tap
    } else {
      a.uavgjort++
      b.uavgjort++
      a.poeng += p.uavgjort
      b.poeng += p.uavgjort
    }
  }
  for (const r of rader.values()) r.diff = r.malFor - r.malMot

  // Sonneborn-Berger og Buchholz bruker motstandernes sluttpoeng.
  const motstanderPoeng = new Map<string, number[]>()
  for (const k of ferdige) {
    if (k.erBye || !k.deltakerAId || !k.deltakerBId) continue
    const a = rader.get(k.deltakerAId)
    const b = rader.get(k.deltakerBId)
    if (!a || !b) continue
    motstanderPoeng.set(a.deltakerId, [...(motstanderPoeng.get(a.deltakerId) ?? []), b.poeng])
    motstanderPoeng.set(b.deltakerId, [...(motstanderPoeng.get(b.deltakerId) ?? []), a.poeng])
    if (k.vinnerId === a.deltakerId) a.sb += b.poeng
    else if (k.vinnerId === b.deltakerId) b.sb += a.poeng
    else if (!k.walkover) {
      a.sb += b.poeng / 2
      b.sb += a.poeng / 2
    }
  }
  for (const r of rader.values()) {
    const mot = motstanderPoeng.get(r.deltakerId) ?? []
    r.bh = mot.reduce((s, x) => s + x, 0)
    r.bh1 = mot.length ? r.bh - Math.min(...mot) : 0
  }

  const sortert = rangerMedTiebreakers(
    [...rader.values()],
    ['POENG', ...effektiveTiebreakers(turnering, profil)],
    { kamper: ferdige, poeng: p },
  )
  sortert.forEach((r, i) => (r.plass = i + 1))
  return sortert
}
