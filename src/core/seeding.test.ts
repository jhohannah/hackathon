import { describe, expect, it } from 'vitest'
import { genererCup, seedDeltakere } from './generatorer/cup'
import { foreslaaNavn, sesong } from './navn'
import { ESPORT, SJAKK } from './profiler'
import { registrerResultat } from './regler/resultat'
import type { Kamp } from './types'

const START = '2026-01-05T18:00:00.000Z'

/** Spiller en hel cup der høyest seedede alltid vinner ("chalk"). */
function spillChalk(n: number) {
  const ids = Array.from({ length: n }, (_, i) => `d${i + 1}`)
  const rating = Object.fromEntries(ids.map((id, i) => [id, 3000 - i * 10]))
  let kamper: Kamp[] = genererCup(ids, { turneringId: 't', start: START, rating, seed: 3 })
  const seedet = seedDeltakere(ids, { seed: 3, rating })
  const styrke = (id?: string) => seedet.indexOf(id!)
  for (let r = 1; r <= Math.max(...kamper.map((k) => k.runde)); r++) {
    for (const k of kamper.filter((x) => x.runde === r && x.status !== 'FERDIG')) {
      const kamp = kamper.find((x) => x.id === k.id)!
      const aVinner = styrke(kamp.deltakerAId) < styrke(kamp.deltakerBId)
      const res = registrerResultat(kamp, aVinner ? { A: 1, B: 0 } : { A: 0, B: 1 }, SJAKK, kamper, {
        kreverVinner: true,
      })
      if (!res.ok) throw new Error(res.feil)
      kamper = kamper.map((x) => res.kamper.find((y) => y.id === x.id) ?? x)
    }
  }
  return { kamper, seedet }
}

describe('seeding', () => {
  it('seed 1 og seed 2 ender i hver sin halvdel og møtes i finalen når de beste vinner', () => {
    for (const n of [4, 5, 6, 8, 12, 16]) {
      const { kamper, seedet } = spillChalk(n)
      const finale = kamper.find((k) => k.runde === Math.max(...kamper.map((x) => x.runde)))!
      expect([finale.deltakerAId, finale.deltakerBId].sort()).toEqual([seedet[0], seedet[1]].sort())
      expect(finale.vinnerId).toBe(seedet[0])
    }
  })

  it('seed rangeres etter rating, og tilfeldig uten rating er deterministisk med samme seed', () => {
    const ids = ['a', 'b', 'c', 'd']
    expect(seedDeltakere(ids, { rating: { a: 1, b: 4, c: 3, d: 2 } })).toEqual(['b', 'c', 'd', 'a'])
    expect(seedDeltakere(ids, { seed: 5 })).toEqual(seedDeltakere(ids, { seed: 5 }))
  })
})

describe('navneforslag', () => {
  const dato = new Date('2026-10-14T12:00:00')

  it('gir riktig antall unike navn', () => {
    const navn = foreslaaNavn({ profil: ESPORT, type: 'SVEITSISK', dato, antall: 6, seed: 1 })
    expect(navn).toHaveLength(6)
    expect(new Set(navn).size).toBe(6)
    expect(navn.every((n) => n.length > 3)).toBe(true)
  })

  it('er deterministisk med samme seed og varierer med ulik seed', () => {
    const a = foreslaaNavn({ profil: SJAKK, type: 'CUP', dato, seed: 7 })
    const b = foreslaaNavn({ profil: SJAKK, type: 'CUP', dato, seed: 7 })
    const c = foreslaaNavn({ profil: SJAKK, type: 'CUP', dato, seed: 8 })
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  it('finner riktig sesong', () => {
    expect(sesong(new Date('2026-10-14'))).toBe('Høst')
    expect(sesong(new Date('2026-01-14'))).toBe('Vinter')
    expect(sesong(new Date('2026-04-14'))).toBe('Vår')
    expect(sesong(new Date('2026-07-14'))).toBe('Sommer')
  })
})
