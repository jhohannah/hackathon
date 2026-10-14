import type { Kamp, Poeng, Tabellrad, TiebreakerId } from '../types'

export interface TbKontekst {
  kamper: Kamp[]
  poeng: Poeng
  /** Gruppen som er likt akkurat nå (brukes av innbyrdes). */
  gruppe: Tabellrad[]
}

export type TbNokkel = TiebreakerId | 'POENG'
type TbFn = (rad: Tabellrad, ctx: TbKontekst) => number

/** Poeng fra kamper mellom de som står likt (minitabell). */
const innbyrdes: TbFn = (rad, ctx) => {
  const ider = new Set(ctx.gruppe.map((r) => r.deltakerId))
  let sum = 0
  for (const k of ctx.kamper) {
    if (k.status !== 'FERDIG' || k.erBye || !k.deltakerAId || !k.deltakerBId) continue
    if (!ider.has(k.deltakerAId) || !ider.has(k.deltakerBId)) continue
    if (k.deltakerAId !== rad.deltakerId && k.deltakerBId !== rad.deltakerId) continue
    if (k.vinnerId === rad.deltakerId) sum += ctx.poeng.seier
    else if (k.vinnerId) sum += ctx.poeng.tap
    else if (k.walkover) sum += ctx.poeng.tap
    else sum += ctx.poeng.uavgjort
  }
  return sum
}

// Små, gjenbrukbare funksjoner. Høyere verdi = bedre.
export const tiebreakerFns: Record<TbNokkel, TbFn> = {
  POENG: (r) => r.poeng,
  DIFF: (r) => r.diff,
  SCORET: (r) => r.malFor,
  INNBYRDES: innbyrdes,
  SB: (r) => r.sb,
  SEIRE: (r) => r.seire,
  SVART: (r) => r.svart,
  BUCHHOLZ: (r) => r.bh,
  BUCHHOLZ_CUT1: (r) => r.bh1,
}

export const TIEBREAKER_NAVN: Record<TiebreakerId, string> = {
  DIFF: 'Målforskjell',
  SCORET: 'Mål scoret',
  INNBYRDES: 'Innbyrdes oppgjør',
  SB: 'Sonneborn-Berger',
  SEIRE: 'Antall seire',
  SVART: 'Kamper med svart',
  BUCHHOLZ: 'Buchholz',
  BUCHHOLZ_CUT1: 'Buchholz Cut-1',
}

/** Rangerer rekursivt: grupper som står likt på en regel går videre til neste regel. */
export function rangerMedTiebreakers(
  rader: Tabellrad[],
  nokler: TbNokkel[],
  ctx0: Omit<TbKontekst, 'gruppe'>,
): Tabellrad[] {
  if (rader.length < 2) return rader
  if (nokler.length === 0) {
    return [...rader].sort((a, b) => a.navn.localeCompare(b.navn, 'nb'))
  }
  const [nokkel, ...rest] = nokler
  const ctx: TbKontekst = { ...ctx0, gruppe: rader }
  const medVerdi = rader
    .map((r) => ({ r, v: tiebreakerFns[nokkel](r, ctx) }))
    .sort((x, y) => y.v - x.v)
  const ut: Tabellrad[] = []
  for (let i = 0; i < medVerdi.length; ) {
    let j = i
    while (j < medVerdi.length && medVerdi[j].v === medVerdi[i].v) j++
    const gruppe = medVerdi.slice(i, j).map((x) => x.r)
    ut.push(...rangerMedTiebreakers(gruppe, rest, ctx0))
    i = j
  }
  return ut
}
