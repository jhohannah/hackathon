import type { Kamp, Side } from '../types'
import { bland, lagRng } from './rng'

/** Spill-uavhengig øyeblikksbilde av en deltaker. Generatoren kjenner ingen spillregler. */
export interface SveitsiskDeltaker {
  id: string
  poeng: number
  seire: number
  tap: number
  rating: number
  motstanderIds: string[]
  sidehistorikk: Side[]
  hattBye: boolean
  aktiv: boolean
}

export interface SveitsiskOpts {
  turneringId: string
  modus: 'RUNDER' | 'GRENSE'
  tidspunkt: string
  seed?: number
}

type P = [SveitsiskDeltaker, SveitsiskDeltaker]

function trengerSide(d: SveitsiskDeltaker): Side | undefined {
  const sist = d.sidehistorikk.slice(-2)
  if (sist.length === 2 && sist[0] === sist[1]) return sist[0] === 'A' ? 'B' : 'A'
  return undefined
}

/** Kan de to parres? Ingen omkamp, og ikke begge tvunget til samme side (ellers 3 på rad). */
function kanParres(x: SveitsiskDeltaker, y: SveitsiskDeltaker, lempet: boolean): boolean {
  if (lempet) return true
  if (x.motstanderIds.includes(y.id)) return false
  const sx = trengerSide(x)
  return !(sx && sx === trengerSide(y))
}

/** Finn en perfekt parring uten omkamper. Foretrekker øvre halvdel mot nedre halvdel. */
function parGruppe(liste: SveitsiskDeltaker[], tillatOmkamp: boolean): P[] | null {
  if (liste.length === 0) return []
  const [forste, ...rest] = liste
  const halv = Math.floor(liste.length / 2) - 1
  const rekkefolge = rest
    .map((_, i) => i)
    .sort((a, b) => Math.abs(a - halv) - Math.abs(b - halv) || a - b)
  for (const i of rekkefolge) {
    const mot = rest[i]
    if (!kanParres(forste, mot, tillatOmkamp)) continue
    const r = parGruppe(
      rest.filter((_, j) => j !== i),
      tillatOmkamp,
    )
    if (r) return [[forste, mot], ...r]
  }
  return null
}

/** Globalt søk: parer hver spiller med nærmeste rangerte motstander det ikke finnes omkamp mot. */
function parNaermeste(liste: SveitsiskDeltaker[], tillatOmkamp: boolean): P[] | null {
  if (liste.length === 0) return []
  const [forste, ...rest] = liste
  for (let i = 0; i < rest.length; i++) {
    if (!kanParres(forste, rest[i], tillatOmkamp)) continue
    const r = parNaermeste(
      rest.filter((_, j) => j !== i),
      tillatOmkamp,
    )
    if (r) return [[forste, rest[i]], ...r]
  }
  return null
}

function sidePreferanse(d: SveitsiskDeltaker): number {
  const a = d.sidehistorikk.filter((s) => s === 'A').length
  const b = d.sidehistorikk.length - a
  let pref = b - a // positiv = bør få A
  const sist = d.sidehistorikk.slice(-2)
  if (sist.length === 2 && sist[0] === sist[1]) pref += sist[0] === 'A' ? -100 : 100
  return pref
}

export function genererSveitsiskRunde(
  snapshot: SveitsiskDeltaker[],
  runde: number,
  opts: SveitsiskOpts,
): Kamp[] {
  const rng = lagRng((opts.seed ?? 1) + runde * 7919)
  const aktive = bland(
    snapshot.filter((d) => d.aktiv),
    rng,
  )
  const nokkel = (d: SveitsiskDeltaker) =>
    opts.modus === 'RUNDER' ? d.poeng : (d.seire - d.tap) * 1000 + d.seire
  // Rangering: best først (score, deretter rating). Stabil sortering beholder tilfeldig rekkefølge ved likhet.
  aktive.sort((a, b) => nokkel(b) - nokkel(a) || b.rating - a.rating)

  const kamper: Kamp[] = []
  const lagId = (i: number) => `${opts.turneringId}-s${runde}-${i}`

  // Bye: laveste rangerte uten tidligere bye.
  let bye: SveitsiskDeltaker | undefined
  if (aktive.length % 2 === 1) {
    const kandidater = aktive.filter((d) => !d.hattBye)
    bye = (kandidater.length ? kandidater : aktive).slice(-1)[0]
    aktive.splice(aktive.indexOf(bye), 1)
  }

  // Grupper på score (poeng, eller seire–tap).
  const grupper = new Map<string, SveitsiskDeltaker[]>()
  for (const d of aktive) {
    const key = opts.modus === 'RUNDER' ? String(d.poeng) : `${d.seire}-${d.tap}`
    grupper.set(key, [...(grupper.get(key) ?? []), d])
  }
  const grupperListe = [...grupper.values()]

  // 1) Gruppevis parring: hver gruppe parer øvre mot nedre halvdel, rest flyter ned.
  const gruppevis = (): P[] | null => {
    const ut: P[] = []
    let ned: SveitsiskDeltaker[] = []
    for (let gi = 0; gi < grupperListe.length; gi++) {
      const liste = [...ned, ...grupperListe[gi]]
      const erSiste = gi === grupperListe.length - 1
      ned = []
      let funnet = false
      for (let f = liste.length % 2; f <= liste.length; f += 2) {
        if (erSiste && f > 0) break
        const m = parGruppe(liste.slice(0, liste.length - f), false)
        if (m) {
          ut.push(...m)
          ned = liste.slice(liste.length - f)
          funnet = true
          break
        }
      }
      if (!funnet) return null
    }
    return ut
  }
  // 2) Globalt søk uten omkamper: nærmeste rangerte først. 3) Siste utvei: tillat omkamp.
  const par: P[] =
    gruppevis() ?? parNaermeste(aktive, false) ?? parNaermeste(aktive, true) ?? []

  par.forEach(([x, y], i) => {
    const xFarA = sidePreferanse(x) >= sidePreferanse(y)
    const [a, b] = xFarA ? [x, y] : [y, x]
    kamper.push({
      id: lagId(i),
      turneringId: opts.turneringId,
      runde,
      deltakerAId: a.id,
      deltakerBId: b.id,
      walkover: false,
      erBye: false,
      tidspunkt: opts.tidspunkt,
      status: 'PLANLAGT',
    })
  })

  if (bye) {
    kamper.push({
      id: lagId(par.length),
      turneringId: opts.turneringId,
      runde,
      deltakerAId: bye.id,
      walkover: false,
      erBye: true,
      vinnerId: bye.id, // bye teller som seier i sveitsisk
      tidspunkt: opts.tidspunkt,
      status: 'FERDIG',
    })
  }
  return kamper
}
