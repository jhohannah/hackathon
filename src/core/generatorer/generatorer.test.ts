import { describe, expect, it } from 'vitest'
import { genererCup, seedRekkefolge } from './cup'
import { genererLiga, genererRoundRobin } from './rundeturnering'
import { SJAKK, ESPORT } from '../profiler'
import { registrerResultat } from '../regler/resultat'
import { genererNesteRunde, sveitsiskSnapshot } from '../regler/sveitsisk'
import { lagDeltakere, lagTurnering } from '../testhjelp'
import { simulerResultat } from '../simulering'
import { lagRng } from './rng'
import type { Kamp } from '../types'

const START = '2026-01-05T18:00:00.000Z'
const ider = (n: number) => Array.from({ length: n }, (_, i) => `d${i + 1}`)

describe('genererCup', () => {
  it('seeder standard: 1–8, 4–5, 2–7, 3–6', () => {
    expect(seedRekkefolge(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
  })

  it('8 deltakere: 7 kamper, ingen byes, toppseedene møtes tidligst i finalen', () => {
    const rating = Object.fromEntries(ider(8).map((id, i) => [id, 2000 - i * 100]))
    const k = genererCup(ider(8), { turneringId: 't', start: START, rating })
    expect(k).toHaveLength(7)
    expect(k.filter((x) => x.erBye)).toHaveLength(0)
    const r1 = k.filter((x) => x.runde === 1)
    expect(r1.map((x) => [x.deltakerAId, x.deltakerBId])).toEqual([
      ['d1', 'd8'],
      ['d4', 'd5'],
      ['d2', 'd7'],
      ['d3', 'd6'],
    ])
    expect(k.filter((x) => x.runde === 3)).toHaveLength(1)
  })

  it('6 deltakere: 2 byes til seed 1 og 2, og de går videre automatisk', () => {
    const rating = Object.fromEntries(ider(6).map((id, i) => [id, 2000 - i * 100]))
    const k = genererCup(ider(6), { turneringId: 't', start: START, rating })
    const byes = k.filter((x) => x.erBye)
    expect(byes).toHaveLength(2)
    expect(byes.map((b) => b.vinnerId).sort()).toEqual(['d1', 'd2'])
    const semi = k.filter((x) => x.runde === 2)
    const iSemi = semi.flatMap((x) => [x.deltakerAId, x.deltakerBId]).filter(Boolean)
    expect(iSemi).toContain('d1')
    expect(iSemi).toContain('d2')
  })

  it('5 deltakere: 3 byes, 4 ekte kamper totalt', () => {
    const k = genererCup(ider(5), { turneringId: 't', start: START, seed: 3 })
    expect(k.filter((x) => x.erBye)).toHaveLength(3)
    expect(k.filter((x) => !x.erBye)).toHaveLength(4)
    expect(k).toHaveLength(7)
  })

  it('vinneren går videre til neste kamp (riktig slot)', () => {
    const k = genererCup(ider(4), { turneringId: 't', start: START, seed: 1 })
    const f = k.find((x) => x.runde === 1)!
    const res = registrerResultat(f, { A: 1, B: 0 }, SJAKK, k, { kreverVinner: true })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const neste = res.kamper.find((x) => x.id === f.nesteKampId)!
    expect(neste.deltakerAId).toBe(f.deltakerAId)
  })

  it('er deterministisk med samme seed', () => {
    const a = genererCup(ider(8), { turneringId: 't', start: START, seed: 5 })
    const b = genererCup(ider(8), { turneringId: 't', start: START, seed: 5 })
    expect(a).toEqual(b)
  })
})

describe('genererRoundRobin (sirkelmetoden)', () => {
  const sjekk = (n: number) => {
    const k = genererRoundRobin(ider(n), { turneringId: 't', start: START })
    const ekte = k.filter((x) => !x.erBye)
    const mott = new Map<string, number>()
    for (const x of ekte) {
      const key = [x.deltakerAId, x.deltakerBId].sort().join('|')
      mott.set(key, (mott.get(key) ?? 0) + 1)
    }
    return { k, ekte, mott }
  }

  it('partall: alle møter alle nøyaktig én gang, n-1 runder', () => {
    const { k, ekte, mott } = sjekk(6)
    expect(ekte).toHaveLength(15)
    expect(mott.size).toBe(15)
    expect([...mott.values()].every((v) => v === 1)).toBe(true)
    expect(Math.max(...k.map((x) => x.runde))).toBe(5)
  })

  it('oddetall: bye hver runde, alle møter alle én gang, n runder', () => {
    const { k, ekte, mott } = sjekk(5)
    expect(ekte).toHaveLength(10)
    expect([...mott.values()].every((v) => v === 1)).toBe(true)
    expect(k.filter((x) => x.erBye)).toHaveLength(5)
    expect(Math.max(...k.map((x) => x.runde))).toBe(5)
  })

  it('fordeler sidene rettferdig (maks 2 i differanse)', () => {
    for (const n of [4, 5, 6, 8]) {
      const { ekte } = sjekk(n)
      const diff: Record<string, number> = {}
      for (const x of ekte) {
        diff[x.deltakerAId!] = (diff[x.deltakerAId!] ?? 0) + 1
        diff[x.deltakerBId!] = (diff[x.deltakerBId!] ?? 0) - 1
      }
      expect(Math.max(...Object.values(diff).map(Math.abs))).toBeLessThanOrEqual(2)
    }
  })

  it('alle runder samme dag med tider fordelt', () => {
    const k = genererRoundRobin(ider(4), { turneringId: 't', start: START, minutterPerKamp: 30 })
    const r2 = k.find((x) => x.runde === 2)!
    expect(new Date(r2.tidspunkt).getTime() - new Date(START).getTime()).toBe(30 * 60_000)
  })
})

describe('genererLiga', () => {
  it('hvert par møtes to ganger med byttede sider', () => {
    const k = genererLiga(ider(6), { turneringId: 't', start: START, dagerMellomRunder: 7 })
    expect(k).toHaveLength(30)
    expect(Math.max(...k.map((x) => x.runde))).toBe(10)
    const ret = new Map<string, string[]>()
    for (const x of k) {
      const key = [x.deltakerAId, x.deltakerBId].sort().join('|')
      ret.set(key, [...(ret.get(key) ?? []), `${x.deltakerAId}>${x.deltakerBId}`])
    }
    for (const v of ret.values()) {
      expect(v).toHaveLength(2)
      expect(v[0].split('>').reverse().join('>')).toBe(v[1])
    }
  })

  it('en runde per uke', () => {
    const k = genererLiga(ider(4), { turneringId: 't', start: START, dagerMellomRunder: 7 })
    const r2 = k.find((x) => x.runde === 2)!
    expect(new Date(r2.tidspunkt).getTime() - new Date(START).getTime()).toBe(7 * 24 * 3600_000)
  })
})

// ---------- Sveitsisk ----------

function spillSveitsisk(n: number, runder: number, modus: 'RUNDER' | 'GRENSE') {
  const profil = modus === 'RUNDER' ? SJAKK : ESPORT
  const d = lagDeltakere(n)
  const t = lagTurnering(
    {
      type: 'SVEITSISK',
      bestOf: 1,
      sveitsisk: { modus, antallRunder: runder, seireForVidere: 3, tapForUte: 3 },
    },
    profil,
  )
  const rng = lagRng(42)
  let kamper: Kamp[] = []
  const rundeLogg: Kamp[][] = []
  for (let r = 1; r <= 12; r++) {
    const ny = genererNesteRunde(t, d, kamper, profil, START)
    if (!ny.ok) break
    kamper = [...kamper, ...ny.kamper]
    rundeLogg.push(ny.kamper)
    for (const k of ny.kamper.filter((x) => !x.erBye)) {
      const a = d.find((x) => x.id === k.deltakerAId)!
      const b = d.find((x) => x.id === k.deltakerBId)!
      const res = registrerResultat(
        k,
        simulerResultat(k, a.rating ?? 0, b.rating ?? 0, profil, { kreverVinner: modus === 'GRENSE', bestOf: 1 }, rng),
        profil,
        kamper,
        { kreverVinner: modus === 'GRENSE', bestOf: 1 },
      )
      if (!res.ok) throw new Error(res.feil)
      kamper = kamper.map((x) => res.kamper.find((y) => y.id === x.id) ?? x)
    }
  }
  return { kamper, d, t, profil, rundeLogg }
}

describe('Sveitsisk RUNDER', () => {
  for (const [n, runder] of [
    [8, 5],
    [9, 4],
  ] as const) {
    it(`${n} spillere × ${runder} runder: ingen omkamper, ingen gjentatte byes, ikke samme farge 3 ganger`, () => {
      const { kamper, d, rundeLogg } = spillSveitsisk(n, runder, 'RUNDER')
      expect(rundeLogg).toHaveLength(runder)
      const motte = new Set<string>()
      for (const k of kamper.filter((x) => !x.erBye)) {
        const key = [k.deltakerAId, k.deltakerBId].sort().join('|')
        expect(motte.has(key)).toBe(false)
        motte.add(key)
      }
      const byes = kamper.filter((x) => x.erBye).map((x) => x.deltakerAId)
      expect(new Set(byes).size).toBe(byes.length)
      if (n % 2 === 1) expect(byes).toHaveLength(runder)
      // Alle spiller hver runde (eller har bye)
      for (const runde of rundeLogg) {
        const iRunden = runde.flatMap((k) => [k.deltakerAId, k.deltakerBId]).filter(Boolean)
        expect(new Set(iRunden).size).toBe(n)
      }
      for (const p of d) {
        const sider = kamper
          .filter((k) => !k.erBye && (k.deltakerAId === p.id || k.deltakerBId === p.id))
          .sort((a, b) => a.runde - b.runde)
          .map((k) => (k.deltakerAId === p.id ? 'A' : 'B'))
        for (let i = 2; i < sider.length; i++) {
          expect(!(sider[i] === sider[i - 1] && sider[i] === sider[i - 2])).toBe(true)
        }
      }
    })
  }

  it('parer spillere med lik eller nærmeste score (runde 2)', () => {
    const { kamper, rundeLogg } = spillSveitsisk(8, 5, 'RUNDER')
    const poengEtterR1 = new Map<string, number>()
    for (const k of kamper.filter((x) => x.runde === 1)) {
      poengEtterR1.set(k.deltakerAId!, k.vinnerId === k.deltakerAId ? 1 : k.vinnerId ? 0 : 0.5)
      poengEtterR1.set(k.deltakerBId!, k.vinnerId === k.deltakerBId ? 1 : k.vinnerId ? 0 : 0.5)
    }
    for (const k of rundeLogg[1]) {
      const diff = Math.abs(poengEtterR1.get(k.deltakerAId!)! - poengEtterR1.get(k.deltakerBId!)!)
      expect(diff).toBeLessThanOrEqual(0.5)
    }
  })
})

describe('Sveitsisk GRENSE (e-sport swiss stage)', () => {
  it('16 lag, 3 seire/3 tap: maks 5 runder, 8 videre og 8 ute, ingen parres etter grensen', () => {
    const { kamper, d, t, profil, rundeLogg } = spillSveitsisk(16, 5, 'GRENSE')
    expect(rundeLogg.length).toBeLessThanOrEqual(5)
    const snap = sveitsiskSnapshot(kamper, d, profil, t)
    expect(snap.filter((s) => s.aktiv)).toHaveLength(0)
    expect(snap.filter((s) => s.seire === 3)).toHaveLength(8)
    expect(snap.filter((s) => s.tap === 3)).toHaveLength(8)

    // Ingen spilte kamp etter å ha nådd grensen, og parene hadde lik rekord
    const rekord = new Map<string, [number, number]>(d.map((x) => [x.id, [0, 0]]))
    for (let r = 1; r <= rundeLogg.length; r++) {
      const runde = kamper.filter((k) => k.runde === r)
      for (const k of runde) {
        const a = rekord.get(k.deltakerAId!)!
        expect(a[0] < 3 && a[1] < 3).toBe(true)
        if (k.deltakerBId) {
          const b = rekord.get(k.deltakerBId)!
          expect(b[0] < 3 && b[1] < 3).toBe(true)
          expect(a).toEqual(b)
        }
      }
      for (const k of runde) {
        if (k.vinnerId && !k.erBye) {
          const taper = k.vinnerId === k.deltakerAId ? k.deltakerBId! : k.deltakerAId!
          rekord.get(k.vinnerId)![0]++
          rekord.get(taper)![1]++
        }
      }
    }
  })

  it('nekter neste runde så lenge kamper er uferdige', () => {
    const d = lagDeltakere(4)
    const t = lagTurnering({ type: 'SVEITSISK', sveitsisk: { modus: 'GRENSE' } }, ESPORT)
    const r1 = genererNesteRunde(t, d, [], ESPORT, START)
    expect(r1.ok).toBe(true)
    if (!r1.ok) return
    const r2 = genererNesteRunde(t, d, r1.kamper, ESPORT, START)
    expect(r2.ok).toBe(false)
  })
})
