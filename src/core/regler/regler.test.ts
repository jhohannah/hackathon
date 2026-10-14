import { describe, expect, it } from 'vitest'
import { ESPORT, FOTBALL, SJAKK } from '../profiler'
import { beregnTabell } from './tabell'
import { registrerResultat, registrerWalkover } from './resultat'
import { kaarVinner } from './vinner'
import { beregnStatus } from './status'
import { validerPamelding } from './pamelding'
import { genererCup } from '../generatorer/cup'
import { ferdigKamp, lagDeltakere, lagTurnering } from '../testhjelp'
import type { Kamp } from '../types'

const tabellFor = (kamper: Kamp[], n: number, profil = FOTBALL, type: 'LIGA' | 'SVEITSISK' = 'LIGA', ekstra = {}) => {
  const d = lagDeltakere(n)
  const t = lagTurnering({ type, ...ekstra }, profil)
  return beregnTabell(kamper, d, profil, t)
}

describe('tabell – fotball', () => {
  it('målforskjell avgjør ved lik poengsum', () => {
    // d1 og d2 har 3 poeng hver; d1 vant 3–0, d2 vant 1–0.
    const k = [
      ferdigKamp('1', 'd1', 'd3', 3, 0),
      ferdigKamp('2', 'd2', 'd4', 1, 0),
    ]
    const tab = tabellFor(k, 4)
    expect(tab[0].deltakerId).toBe('d1')
    expect(tab[1].deltakerId).toBe('d2')
    expect(tab[0].diff).toBe(3)
    expect(tab[0].poeng).toBe(3)
  })

  it('3-veis innbyrdes: minitabellen avgjør når poeng, diff og mål er likt for tre lag', () => {
    // d3, d2 og d1 ender alle på 6 poeng, diff 0 og 3 mål scoret.
    // Innbyrdes: d3 slo d2 og d1, d2 slo d1 → minitabell d3 6, d2 3, d1 0.
    // (Alfabetisk ville gitt d1, d2, d3 – så testen fanger at innbyrdes brukes.)
    const k = [
      ferdigKamp('1', 'd3', 'd2', 1, 0),
      ferdigKamp('2', 'd3', 'd1', 1, 0),
      ferdigKamp('3', 'd2', 'd1', 1, 0),
      ferdigKamp('4', 'd3', 'd4', 1, 3),
      ferdigKamp('5', 'd2', 'd4', 1, 0),
      ferdigKamp('6', 'd2', 'd5', 1, 2),
      ferdigKamp('7', 'd1', 'd4', 2, 1),
      ferdigKamp('8', 'd1', 'd5', 1, 0),
    ]
    const tab = tabellFor(k, 5)
    const rad = (id: string) => tab.find((r) => r.deltakerId === id)!
    for (const id of ['d1', 'd2', 'd3']) {
      expect(rad(id)).toMatchObject({ poeng: 6, diff: 0, malFor: 3 })
    }
    const topp3 = tab.filter((r) => ['d1', 'd2', 'd3'].includes(r.deltakerId)).map((r) => r.deltakerId)
    expect(topp3).toEqual(['d3', 'd2', 'd1'])
  })

  it('innbyrdes oppgjør avgjør når poeng, diff og mål er likt (2 lag)', () => {
    // d1, d2, d3 alle 3 poeng, samme diff (0) og mål (2–2). Innbyrdes er ulikt:
    // d1–d2 1–0, d2–d3 1–0, d1–d3 0–1 ⇒ minitabell d1 3, d2 3, d3 3 – likt. Vi bytter til ulikt:
    // d1–d2 1–0, d1–d3 1–0, d2–d3 1–0 ⇒ d1 6, d2 3, d3 0 (samme total for alle, via d4).
    const k = [
      ferdigKamp('1', 'd1', 'd2', 1, 0),
      ferdigKamp('2', 'd1', 'd3', 1, 0),
      ferdigKamp('3', 'd2', 'd3', 1, 0),
      // mot d4 kompenserer vi slik at alle tre ender med lik poengsum (6), diff og mål:
      ferdigKamp('4', 'd1', 'd4', 0, 1), // d1: 6p, diff +1... tap
      ferdigKamp('5', 'd2', 'd4', 1, 0), // d2: 3+3 = 6p
      ferdigKamp('6', 'd3', 'd4', 1, 0), // d3: 0+3 = 3p
    ]
    const tab = tabellFor(k, 4)
    // d1 6p (diff +1), d2 6p (diff +1... 1-0 + 1-0 =+2? d2: slo d3 1–0, tapte 0–1 mot d1, slo d4 1–0 → +1)
    // d1 og d2 er likt på poeng, diff (+1) og scoret (2) → innbyrdes: d1 slo d2 ⇒ d1 først.
    expect(tab[0].deltakerId).toBe('d1')
    expect(tab[1].deltakerId).toBe('d2')
    expect(tab[0].poeng).toBe(tab[1].poeng)
    expect(tab[0].diff).toBe(tab[1].diff)
    expect(tab[0].malFor).toBe(tab[1].malFor)
  })

  it('eget poengsystem (2/1/0) endrer tabellen', () => {
    const k = [ferdigKamp('1', 'd1', 'd2', 1, 1), ferdigKamp('2', 'd1', 'd3', 1, 0)]
    const std = tabellFor(k, 3)
    const eget = tabellFor(k, 3, FOTBALL, 'LIGA', { poengOverstyring: { seier: 2, uavgjort: 1, tap: 0 } })
    expect(std[0].poeng).toBe(4)
    expect(eget[0].poeng).toBe(3)
  })
})

describe('tabell – sjakk', () => {
  it('Sonneborn-Berger avgjør ved lik poengsum og innbyrdes likt', () => {
    // d1 og d2 har begge 1 poeng og har ikke møtt hverandre.
    // d1 slo d3 (som har 2 poeng via andre seiere), d2 slo d4 (0 poeng).
    const k = [
      ferdigKamp('1', 'd1', 'd3', 1, 0),
      ferdigKamp('2', 'd2', 'd4', 1, 0),
      ferdigKamp('3', 'd3', 'd5', 1, 0),
      ferdigKamp('4', 'd3', 'd6', 1, 0),
    ]
    const tab = tabellFor(k, 6, SJAKK, 'LIGA')
    const rad = (id: string) => tab.find((r) => r.deltakerId === id)!
    expect(rad('d3').poeng).toBe(2)
    expect(rad('d1').poeng).toBe(1)
    expect(rad('d2').poeng).toBe(1)
    expect(rad('d1').sb).toBe(2) // slo d3 som har 2
    expect(rad('d2').sb).toBe(0) // slo d4 som har 0
    const plass = (id: string) => tab.findIndex((r) => r.deltakerId === id)
    expect(plass('d1')).toBeLessThan(plass('d2'))
  })

  it('½-poeng og SB-halvering ved remis', () => {
    const k = [ferdigKamp('1', 'd1', 'd2', 0.5, 0.5), ferdigKamp('2', 'd2', 'd3', 1, 0)]
    const tab = tabellFor(k, 3, SJAKK)
    const d1 = tab.find((r) => r.deltakerId === 'd1')!
    expect(d1.poeng).toBe(0.5)
    expect(d1.sb).toBe(0.75) // halvparten av d2 sine 1,5 poeng
  })
})

describe('Buchholz (sveitsisk)', () => {
  it('beregner Buchholz og Buchholz Cut-1, og Buchholz avgjør tabellen', () => {
    // d1 og d2 har 1 poeng. d1 slo d3, d2 slo d4. d3 har 2 poeng totalt (slo d5, d6), d4 har 0.
    const k = [
      ferdigKamp('1', 'd1', 'd3', 1, 0),
      ferdigKamp('2', 'd2', 'd4', 1, 0),
      ferdigKamp('3', 'd3', 'd5', 1, 0),
      ferdigKamp('4', 'd3', 'd6', 1, 0),
    ]
    const tab = tabellFor(k, 6, SJAKK, 'SVEITSISK', { sveitsisk: { modus: 'RUNDER' } })
    const rad = (id: string) => tab.find((r) => r.deltakerId === id)!
    expect(rad('d3').bh).toBe(1 + 0 + 0) // møtte d1 (1), d5 (0), d6 (0)
    expect(rad('d3').bh1).toBe(1 + 0 + 0 - 0)
    expect(rad('d1').bh).toBe(2)
    expect(rad('d1').bh1).toBe(0) // eneste motstander trekkes fra
  })

  it('Buchholz Cut-1 trekker fra laveste motstander', () => {
    const k = [
      ferdigKamp('1', 'd1', 'd2', 1, 0),
      ferdigKamp('2', 'd1', 'd3', 1, 0),
      ferdigKamp('3', 'd2', 'd4', 1, 0),
    ]
    const tab = tabellFor(k, 4, SJAKK, 'SVEITSISK', { sveitsisk: { modus: 'RUNDER' } })
    const d1 = tab.find((r) => r.deltakerId === 'd1')!
    // motstandere: d2 (1p), d3 (0p) → BH 1, cut-1 = 1 − 0 = 1
    expect(d1.bh).toBe(1)
    expect(d1.bh1).toBe(1)
    const d4 = tab.find((r) => r.deltakerId === 'd4')!
    expect(d4.bh).toBe(1)
    expect(d4.bh1).toBe(0) // eneste motstander trekkes fra
  })

  it('Buchholz avgjør rekkefølgen i en sveitsisk tabell', () => {
    // d1 og d2 har like mange poeng. d1 møtte sterk motstand (d3 har 2), d2 møtte svak (d4 har 0).
    const k = [
      ferdigKamp('1', 'd1', 'd3', 1, 0),
      ferdigKamp('2', 'd2', 'd4', 1, 0),
      ferdigKamp('3', 'd3', 'd5', 1, 0),
      ferdigKamp('4', 'd3', 'd6', 1, 0),
    ]
    const tab = tabellFor(k, 6, SJAKK, 'SVEITSISK', { sveitsisk: { modus: 'RUNDER' } })
    const plass = (id: string) => tab.findIndex((r) => r.deltakerId === id)
    expect(plass('d1')).toBeLessThan(plass('d2'))
  })
})

describe('uavgjort i cup', () => {
  const cup = () => {
    const d = ['d1', 'd2']
    const k = genererCup(d, { turneringId: 't', start: '2026-01-05T18:00:00.000Z' })
    return k
  }

  it('fotball: krever straffer og vinneren avgjøres av dem', () => {
    const k = cup()
    const uten = registrerResultat(k[0], { A: 1, B: 1 }, FOTBALL, k, { kreverVinner: true })
    expect(uten.ok).toBe(false)
    const med = registrerResultat(k[0], { A: 1, B: 1, straffer: { A: 4, B: 3 } }, FOTBALL, k, { kreverVinner: true })
    expect(med.ok).toBe(true)
    if (!med.ok) return
    expect(med.kamper[0].vinnerId).toBe(k[0].deltakerAId)
    expect(med.kamper[0].avgjoring).toEqual({ metode: 'STRAFFER', A: 4, B: 3, vinnerId: k[0].deltakerAId })
  })

  it('sjakk: remis avgjøres av armageddon-vinner', () => {
    const k = cup()
    const uten = registrerResultat(k[0], { A: 0.5, B: 0.5 }, SJAKK, k, { kreverVinner: true })
    expect(uten.ok).toBe(false)
    const med = registrerResultat(k[0], { A: 0.5, B: 0.5, armageddonVinner: 'B' }, SJAKK, k, { kreverVinner: true })
    expect(med.ok).toBe(true)
    if (!med.ok) return
    expect(med.kamper[0].vinnerId).toBe(k[0].deltakerBId)
    expect(med.kamper[0].avgjoring?.metode).toBe('ARMAGEDDON')
  })

  it('remis er lov i liga uten avgjøring', () => {
    const k = cup()
    const r = registrerResultat(k[0], { A: 1, B: 1 }, FOTBALL, k, { kreverVinner: false })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.kamper[0].vinnerId).toBeUndefined()
  })

  it('e-sport: validerer kartresultat mot best-of', () => {
    const k = cup()
    expect(registrerResultat(k[0], { A: 2, B: 1 }, ESPORT, k, { kreverVinner: true, bestOf: 3 }).ok).toBe(true)
    expect(registrerResultat(k[0], { A: 3, B: 0 }, ESPORT, k, { kreverVinner: true, bestOf: 3 }).ok).toBe(false)
    expect(registrerResultat(k[0], { A: 1, B: 1 }, ESPORT, k, { kreverVinner: true, bestOf: 3 }).ok).toBe(false)
  })
})

describe('walkover', () => {
  it('fotball: den som møtte får 3–0 og 3 poeng', () => {
    const k: Kamp[] = [{ ...ferdigKamp('1', 'd1', 'd2', 0, 0), status: 'PLANLAGT', vinnerId: undefined }]
    const r = registrerWalkover(k[0], 'B', FOTBALL, k, { erCup: false })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.kamper[0]).toMatchObject({ resultatA: 0, resultatB: 3, vinnerId: 'd2', walkover: true, status: 'FERDIG' })
    const tab = tabellFor(r.kamper, 2)
    expect(tab.find((x) => x.deltakerId === 'd2')!.poeng).toBe(3)
    expect(tab.find((x) => x.deltakerId === 'd1')!.poeng).toBe(0)
  })

  it('e-sport bo3: 2–0', () => {
    const k: Kamp[] = [{ ...ferdigKamp('1', 'd1', 'd2', 0, 0), status: 'PLANLAGT', vinnerId: undefined }]
    const r = registrerWalkover(k[0], 'A', ESPORT, k, { erCup: false, bestOf: 3 })
    expect(r.ok && r.kamper[0].resultatA).toBe(2)
  })

  it('cup: vinneren går videre, og "ingen møtte" er ikke lov', () => {
    const k = genererCup(['d1', 'd2', 'd3', 'd4'], { turneringId: 't', start: '2026-01-05T18:00:00.000Z' })
    const f = k[0]
    const r = registrerWalkover(f, 'A', SJAKK, k, { erCup: true })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.kamper.find((x) => x.id === f.nesteKampId)?.deltakerAId).toBe(f.deltakerAId)
    expect(registrerWalkover(f, 'INGEN', SJAKK, k, { erCup: true }).ok).toBe(false)
  })

  it('ingen møtte i liga: begge får tap', () => {
    const k: Kamp[] = [{ ...ferdigKamp('1', 'd1', 'd2', 0, 0), status: 'PLANLAGT', vinnerId: undefined }]
    const r = registrerWalkover(k[0], 'INGEN', FOTBALL, k, { erCup: false })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const tab = tabellFor(r.kamper, 2)
    expect(tab.map((x) => x.tap)).toEqual([1, 1])
    expect(tab.map((x) => x.poeng)).toEqual([0, 0])
  })
})

describe('kåring av vinner og status', () => {
  it('cup: vinner, andre og tredje', () => {
    const d = lagDeltakere(4)
    const t = lagTurnering({ type: 'CUP' }, SJAKK)
    let k = genererCup(d.map((x) => x.id), { turneringId: 't', start: '2026-01-05T18:00:00.000Z', seed: 2 })
    const spill = (kampId: string, A: number, B: number) => {
      const kamp = k.find((x) => x.id === kampId)!
      const res = registrerResultat(kamp, { A, B }, SJAKK, k, { kreverVinner: true })
      if (!res.ok) throw new Error(res.feil)
      k = k.map((x) => res.kamper.find((y) => y.id === x.id) ?? x)
    }
    spill('t-c1-0', 1, 0)
    spill('t-c1-1', 0, 1)
    expect(beregnStatus(t, k, d, SJAKK)).toBe('PAGAR')
    spill('t-c2-0', 1, 0)
    expect(beregnStatus(t, k, d, SJAKK)).toBe('AVSLUTTET')
    const tab = beregnTabell(k, d, SJAKK, t)
    const p = kaarVinner(t, k, tab)
    const finale = k.find((x) => x.runde === 2)!
    expect(p.vinner).toBe(finale.vinnerId)
    expect(p.andre).toBeDefined()
    expect(p.tredje).toHaveLength(2)
  })

  it('liga: vinner er nummer 1 i tabellen', () => {
    const d = lagDeltakere(3)
    const t = lagTurnering({ type: 'LIGA' }, FOTBALL)
    const k = [ferdigKamp('1', 'd1', 'd2', 2, 0), ferdigKamp('2', 'd2', 'd3', 0, 1), ferdigKamp('3', 'd1', 'd3', 1, 0)]
    const tab = beregnTabell(k, d, FOTBALL, t)
    expect(kaarVinner(t, k, tab).vinner).toBe('d1')
    expect(beregnStatus(t, k, d, FOTBALL)).toBe('AVSLUTTET')
  })
})

describe('påmelding', () => {
  const t = lagTurnering({ type: 'CUP', deltakertype: 'LAG', status: 'PAMELDING_APEN', maksDeltakere: 2, lagstorrelse: 5 }, ESPORT)

  it('validerer spilltype, lagstørrelse og duplikater', () => {
    const d = lagDeltakere(1)
    const feil = validerPamelding(
      { type: 'LAG', navn: 'Spiller 01', kaptein: 'Ola', spillere: ['A', 'B'] },
      t,
      ESPORT,
      d,
    )
    expect(feil.navn).toMatch(/allerede/)
    expect(feil.spillere).toMatch(/mellom 5 og 7/)
    const feil2 = validerPamelding({ type: 'SPILLER', navn: 'X' }, t, ESPORT, [])
    expect(feil2.type).toMatch(/kun for lag/)
  })

  it('stopper når turneringen er full eller stengt', () => {
    expect(validerPamelding({ type: 'LAG', navn: 'Nytt' }, t, ESPORT, lagDeltakere(2)).generelt).toMatch(/full/)
    const stengt = { ...t, status: 'PAGAR' as const }
    expect(validerPamelding({ type: 'LAG', navn: 'Nytt' }, stengt, ESPORT, []).generelt).toMatch(/ikke åpen/)
  })

  it('sjakk tillater ikke lag', () => {
    const ts = lagTurnering({ type: 'CUP', status: 'PAMELDING_APEN' }, SJAKK)
    expect(validerPamelding({ type: 'LAG', navn: 'Lag' }, ts, SJAKK, []).type).toMatch(/kan ikke/)
  })
})
