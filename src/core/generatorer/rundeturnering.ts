import type { Kamp } from '../types'
import { leggTilDager, leggTilMinutter } from './tid'

type Par = [string | null, string | null]

/**
 * Sirkelmetoden. Oddetall gir en "bye" (null). Sidene (A/B = hjemme/borte, hvit/svart)
 * fordeles grådig slik at ingen får mer enn ett par ekstra av samme side.
 */
export function sirkelmetoden(ids: string[]): Par[][] {
  const spillere: (string | null)[] = [...ids]
  if (spillere.length % 2 === 1) spillere.push(null)
  const n = spillere.length
  let arr = [...spillere]
  const runder: Par[][] = []
  const antallA: Record<string, number> = {}
  const antallB: Record<string, number> = {}
  const diff = (id: string) => (antallA[id] ?? 0) - (antallB[id] ?? 0)

  for (let r = 0; r < n - 1; r++) {
    const par: Par[] = []
    for (let i = 0; i < n / 2; i++) {
      let x = arr[i]
      let y = arr[n - 1 - i]
      if (x && y) {
        const dx = diff(x)
        const dy = diff(y)
        // Den med flest A-kamper så langt får B.
        if (dx > dy || (dx === dy && (r + i) % 2 === 1)) [x, y] = [y, x]
        antallA[x] = (antallA[x] ?? 0) + 1
        antallB[y] = (antallB[y] ?? 0) + 1
      } else if (!x) {
        ;[x, y] = [y, x]
      }
      par.push([x, y])
    }
    runder.push(par)
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)]
  }
  return runder
}

function tilKamp(
  turneringId: string,
  runde: number,
  indeks: number,
  par: Par,
  tidspunkt: string,
): Kamp {
  const [a, b] = par
  const erBye = !a || !b
  return {
    id: `${turneringId}-r${runde}-${indeks}`,
    turneringId,
    runde,
    deltakerAId: a ?? undefined,
    deltakerBId: b ?? undefined,
    walkover: false,
    erBye,
    tidspunkt,
    status: erBye ? 'FERDIG' : 'PLANLAGT',
  }
}

export interface AlleMotAlleOpts {
  turneringId: string
  start: string
  minutterPerKamp?: number
}

/** Alle mot alle: alle runder samme dag, tidene fordelt med `minutterPerKamp`. */
export function genererRoundRobin(ids: string[], opts: AlleMotAlleOpts): Kamp[] {
  if (ids.length < 2) return []
  const min = opts.minutterPerKamp ?? 45
  return sirkelmetoden(ids).flatMap((par, r) =>
    par.map((p, i) =>
      tilKamp(opts.turneringId, r + 1, i, p, leggTilMinutter(opts.start, r * min)),
    ),
  )
}

export interface LigaOpts {
  turneringId: string
  start: string
  dagerMellomRunder?: number
}

/** Liga: dobbel runde. Andre halvdel har byttet side (hjemme/borte, hvit/svart). */
export function genererLiga(ids: string[], opts: LigaOpts): Kamp[] {
  if (ids.length < 2) return []
  const dager = opts.dagerMellomRunder ?? 7
  const forste = sirkelmetoden(ids)
  const alle: Par[][] = [
    ...forste,
    ...forste.map((runde) => runde.map(([a, b]): Par => (a && b ? [b, a] : [a, b]))),
  ]
  return alle.flatMap((par, r) =>
    par.map((p, i) =>
      tilKamp(opts.turneringId, r + 1, i, p, leggTilDager(opts.start, r * dager)),
    ),
  )
}
