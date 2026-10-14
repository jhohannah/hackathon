import { describe, expect, it } from 'vitest'
import { lagSeed } from './seed'
import { hentProfil } from './core/profiler'
import { beregnTabell } from './core/regler/tabell'
import { kaarVinner } from './core/regler/vinner'
import { genererNesteRunde } from './core/regler/sveitsisk'
import { registrerResultat } from './core/regler/resultat'
import { erIDag } from './lib/tid'

describe('demodata', () => {
  const data = lagSeed(new Date())
  const t = (id: string) => data.turneringer.find((x) => x.id === id)!
  const kamperAv = (id: string) => data.kamper.filter((k) => k.turneringId === id)
  const deltAv = (id: string) => data.deltakere.filter((d) => d.turneringId === id)

  it('har minst 5 turneringer med ulike statuser', () => {
    expect(data.turneringer.length).toBeGreaterThanOrEqual(5)
    const statuser = new Set(data.turneringer.map((x) => x.status))
    expect(statuser).toEqual(new Set(['PAGAR', 'AVSLUTTET', 'PAMELDING_APEN']))
  })

  it('sjakkcupen har en armageddon-kamp og semifinaler i dag', () => {
    const k = kamperAv('t-sjakk-cup')
    expect(k.filter((x) => x.avgjoring?.metode === 'ARMAGEDDON')).toHaveLength(1)
    const semi = k.filter((x) => x.runde === 2)
    expect(semi.every((x) => x.status === 'PLANLAGT' && erIDag(x.tidspunkt))).toBe(true)
    expect(semi.every((x) => x.deltakerAId && x.deltakerBId)).toBe(true)
  })

  it('fotballigaen har 3 spilte runder, et forfall og runde 4 i dag', () => {
    const k = kamperAv('t-fotball-liga')
    expect(k).toHaveLength(30)
    expect(k.filter((x) => x.status === 'FERDIG')).toHaveLength(9)
    expect(k.filter((x) => x.walkover)).toHaveLength(1)
    expect(k.filter((x) => x.runde === 4).every((x) => erIDag(x.tidspunkt))).toBe(true)
    expect(k.filter((x) => x.status === 'PAGAR')).toHaveLength(1)
  })

  it('e-sport alle mot alle har bye og halvparten spilt', () => {
    const k = kamperAv('t-esport-rr')
    expect(k.filter((x) => x.erBye)).toHaveLength(5)
    expect(k.filter((x) => !x.erBye && x.status === 'FERDIG')).toHaveLength(6)
    expect(k.filter((x) => !x.erBye && x.status !== 'FERDIG')).toHaveLength(4)
  })

  it('swiss stage: runde 3 mangler én kamp, og demoen kan fullføre og generere runde 4', () => {
    const turn = t('t-esport-swiss')
    const profil = hentProfil('esport')
    let k = kamperAv(turn.id)
    const uferdig = k.filter((x) => x.status !== 'FERDIG')
    expect(uferdig).toHaveLength(1)
    expect(uferdig[0].runde).toBe(3)
    const blokkert = genererNesteRunde(turn, deltAv(turn.id), k, profil, new Date().toISOString())
    expect(blokkert.ok).toBe(false)
    const res = registrerResultat(uferdig[0], { A: 1, B: 0 }, profil, k, { kreverVinner: true, bestOf: 1 })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    k = k.map((x) => res.kamper.find((y) => y.id === x.id) ?? x)
    const neste = genererNesteRunde(turn, deltAv(turn.id), k, profil, new Date().toISOString())
    expect(neste.ok).toBe(true)
    if (neste.ok) expect(neste.kamper.every((x) => x.runde === 4)).toBe(true)
  })

  it('sjakk-swiss har 3 ferdige runder', () => {
    const k = kamperAv('t-sjakk-swiss')
    expect(Math.max(...k.map((x) => x.runde))).toBe(3)
    expect(k.every((x) => x.status === 'FERDIG')).toBe(true)
  })

  it('ferdig cup har vinner, andre og to på delt tredjeplass', () => {
    const turn = t('t-fotball-cup')
    expect(turn.status).toBe('AVSLUTTET')
    const tab = beregnTabell(kamperAv(turn.id), deltAv(turn.id), hentProfil('fotball'), turn)
    const p = kaarVinner(turn, kamperAv(turn.id), tab)
    expect(p.vinner && p.andre && p.tredje?.length === 2).toBeTruthy()
  })

  it('påmeldingsturneringer har deltakere men ingen kamper', () => {
    for (const id of ['t-valorant-cup', 't-hurtigsjakk']) {
      expect(t(id).status).toBe('PAMELDING_APEN')
      expect(deltAv(id).length).toBeGreaterThan(0)
      expect(kamperAv(id)).toHaveLength(0)
    }
  })
})
