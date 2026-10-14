import type { Kamp } from '../types'
import { bland, lagRng } from './rng'
import { leggTilDager, leggTilMinutter } from './tid'

export interface CupOpts {
  turneringId: string
  start: string
  seed?: number
  /** Gir seeding etter rating (høyest = seed 1). Uten rating: tilfeldig. */
  rating?: Record<string, number>
  minutterPerKamp?: number
  dagerMellomRunder?: number
  /** Overstyrer tidspunkt per kamp. */
  tidspunkt?: (runde: number, indeks: number) => string
}

/** Standard brakettplassering: 1–N, 2–(N-1) ... slik at toppseedene møtes sent. */
export function seedRekkefolge(storrelse: number): number[] {
  let o = [1]
  while (o.length < storrelse) {
    const n = o.length * 2
    o = o.flatMap((s) => [s, n + 1 - s])
  }
  return o
}

export function genererCup(deltakerIds: string[], opts: CupOpts): Kamp[] {
  const n = deltakerIds.length
  if (n < 2) return []
  const rng = lagRng(opts.seed ?? 1)
  let sortert = bland(deltakerIds, rng)
  if (opts.rating) {
    const r = opts.rating
    sortert = [...sortert].sort((a, b) => (r[b] ?? 0) - (r[a] ?? 0))
  }

  let storrelse = 1
  while (storrelse < n) storrelse *= 2
  const antallRunder = Math.log2(storrelse)
  const rekkefolge = seedRekkefolge(storrelse)
  const tid =
    opts.tidspunkt ??
    ((runde: number, indeks: number) =>
      leggTilMinutter(
        leggTilDager(opts.start, (runde - 1) * (opts.dagerMellomRunder ?? 0)),
        ((runde - 1) * 120 + indeks * (opts.minutterPerKamp ?? 45)),
      ))

  const id = (r: number, i: number) => `${opts.turneringId}-c${r}-${i}`
  const kamper: Kamp[] = []
  for (let r = 1; r <= antallRunder; r++) {
    const antall = storrelse / 2 ** r
    for (let i = 0; i < antall; i++) {
      const k: Kamp = {
        id: id(r, i),
        turneringId: opts.turneringId,
        runde: r,
        walkover: false,
        erBye: false,
        tidspunkt: tid(r, i),
        status: 'PLANLAGT',
      }
      if (r < antallRunder) {
        k.nesteKampId = id(r + 1, Math.floor(i / 2))
        k.nesteKampSlot = i % 2 === 0 ? 'A' : 'B'
      }
      if (r === 1) {
        const sa = rekkefolge[2 * i]
        const sb = rekkefolge[2 * i + 1]
        k.deltakerAId = sa <= n ? sortert[sa - 1] : undefined
        k.deltakerBId = sb <= n ? sortert[sb - 1] : undefined
      }
      kamper.push(k)
    }
  }

  // Byes i runde 1: den som har motstander går videre automatisk.
  for (const k of kamper.filter((x) => x.runde === 1)) {
    if (!k.deltakerAId || !k.deltakerBId) {
      const vinner = k.deltakerAId ?? k.deltakerBId
      k.erBye = true
      k.status = 'FERDIG'
      k.vinnerId = vinner
      // Hvis byen er på side B flyttes deltakeren til A for penere visning.
      k.deltakerAId = vinner
      k.deltakerBId = undefined
      const neste = kamper.find((x) => x.id === k.nesteKampId)
      if (neste && vinner) {
        if (k.nesteKampSlot === 'A') neste.deltakerAId = vinner
        else neste.deltakerBId = vinner
      }
    }
  }
  return kamper
}
