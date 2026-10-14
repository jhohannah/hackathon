import type { Kamp, ResultatInput, ResultatOpts, Spillprofil } from './types'
import { kartTilVinn } from './regler/resultat'

/** Lager et troverdig resultat ut fra ratingene. Brukes til demodata og tester. */
export function simulerResultat(
  kamp: Kamp,
  ratingA: number,
  ratingB: number,
  profil: Spillprofil,
  opts: ResultatOpts,
  rng: () => number,
): ResultatInput {
  const sA = ratingA > 0 && ratingB > 0 ? ratingA / (ratingA + ratingB) : 0.5
  if (profil.resultatformat === 'SJAKK') {
    const r = rng()
    const seierA = sA * 0.7
    if (r < seierA) return { A: 1, B: 0 }
    if (r < seierA + 0.22) {
      return opts.kreverVinner ? { A: 0.5, B: 0.5, armageddonVinner: rng() < sA ? 'A' : 'B' } : { A: 0.5, B: 0.5 }
    }
    return { A: 0, B: 1 }
  }
  if (profil.resultatformat === 'KART') {
    const vinn = kartTilVinn(opts.bestOf ?? 1)
    const taper = Math.floor(rng() * vinn)
    return rng() < sA ? { A: vinn, B: taper } : { A: taper, B: vinn }
  }
  const mal = (styrke: number) => Math.round(rng() * 2.4 * (0.4 + styrke))
  const A = mal(sA)
  const B = mal(1 - sA)
  if (A === B && opts.kreverVinner) {
    const sa = 3 + Math.floor(rng() * 3)
    const sb = sa + (rng() < 0.5 ? 1 : -1)
    return { A, B, straffer: { A: sa, B: sb } }
  }
  return { A, B }
}
