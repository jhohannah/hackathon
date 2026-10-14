import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './store'
import { hentProfil } from './core/profiler'
import { beregnTabell } from './core/regler/tabell'

const s = () => useStore.getState()
const kamp = (id: string) => s().kamper.find((k) => k.id === id)!
const turn = (id: string) => s().turneringer.find((t) => t.id === id)!

beforeEach(() => {
  s().nullstill()
})

describe('demoflyt gjennom storen', () => {
  it('sjakkcup: remis krever armageddon, vinneren går videre, og finalen kårer vinner', () => {
    const semi = s().kamper.filter((k) => k.turneringId === 't-sjakk-cup' && k.runde === 2)
    expect(semi).toHaveLength(2)

    const uten = s().lagreResultat(semi[0].id, { A: 0.5, B: 0.5 })
    expect(uten.ok).toBe(false)

    const med = s().lagreResultat(semi[0].id, { A: 0.5, B: 0.5, armageddonVinner: 'B' })
    expect(med.ok).toBe(true)
    const finale = s().kamper.find((k) => k.turneringId === 't-sjakk-cup' && k.runde === 3)!
    expect(finale.deltakerAId).toBe(kamp(semi[0].id).deltakerBId)
    expect(turn('t-sjakk-cup').status).toBe('PAGAR')

    expect(s().lagreResultat(semi[1].id, { A: 1, B: 0 }).ok).toBe(true)
    const f2 = s().kamper.find((k) => k.id === finale.id)!
    expect(f2.deltakerAId && f2.deltakerBId).toBeTruthy()
    expect(s().lagreResultat(f2.id, { A: 1, B: 0 }).ok).toBe(true)
    expect(turn('t-sjakk-cup').status).toBe('AVSLUTTET')
  })

  it('fotballiga: forfall gir seieren til den som møtte, og tabellen oppdateres', () => {
    const planlagt = s().kamper.find((k) => k.turneringId === 't-fotball-liga' && k.status === 'PLANLAGT')!
    const t = turn('t-fotball-liga')
    const profil = hentProfil('fotball')
    const deltakere = s().deltakere.filter((d) => d.turneringId === t.id)
    const poengFør = beregnTabell(s().kamper.filter((k) => k.turneringId === t.id), deltakere, profil, t).find(
      (r) => r.deltakerId === planlagt.deltakerBId,
    )!.poeng

    expect(s().lagreWalkover(planlagt.id, 'B').ok).toBe(true)
    const etter = kamp(planlagt.id)
    expect(etter).toMatchObject({ walkover: true, status: 'FERDIG', vinnerId: planlagt.deltakerBId, resultatB: 3, resultatA: 0 })
    const poengEtter = beregnTabell(s().kamper.filter((k) => k.turneringId === t.id), deltakere, profil, t).find(
      (r) => r.deltakerId === planlagt.deltakerBId,
    )!.poeng
    expect(poengEtter).toBe(poengFør + 3)
  })

  it('swiss stage: neste runde er sperret til siste kamp er ferdig, deretter uten omkamper', () => {
    const id = 't-esport-swiss'
    expect(s().nesteRunde(id).ok).toBe(false)
    const siste = s().kamper.find((k) => k.turneringId === id && k.status !== 'FERDIG')!
    expect(s().lagreResultat(siste.id, { A: 1, B: 0 }).ok).toBe(true)
    expect(s().nesteRunde(id).ok).toBe(true)

    const alle = s().kamper.filter((k) => k.turneringId === id && !k.erBye)
    const par = alle.map((k) => [k.deltakerAId, k.deltakerBId].sort().join('|'))
    expect(new Set(par).size).toBe(par.length)
    expect(alle.some((k) => k.runde === 4)).toBe(true)
  })

  it('admin: opprett turnering, meld på, generer oppsett', () => {
    const id = s().opprettTurnering({
      navn: 'Test-cup',
      spillprofilId: 'esport',
      type: 'CUP',
      deltakertype: 'SPILLER',
      maksDeltakere: 8,
      startdato: new Date().toISOString(),
      bestOf: 3,
    })
    expect(turn(id).status).toBe('PAMELDING_APEN')
    expect(s().genererOppsett(id).ok).toBe(false) // for få deltakere
    for (const n of ['Anna', 'Bjørn', 'Cecilie', 'Dag', 'Eva']) {
      expect(s().meldPa(id, { type: 'SPILLER', navn: n, rating: 1500 }).ok).toBe(true)
    }
    const dup = s().meldPa(id, { type: 'SPILLER', navn: 'anna' })
    expect(dup.ok).toBe(false)
    expect(s().genererOppsett(id).ok).toBe(true)
    expect(turn(id).status).toBe('PAGAR')
    expect(s().kamper.filter((k) => k.turneringId === id && k.erBye)).toHaveLength(3)
    expect(s().genererOppsett(id).ok).toBe(false) // allerede generert
  })

  it('påmelding: lag valideres mot lagstørrelse, og 1v1 avvises i lag-turnering', () => {
    const id = 't-valorant-cup'
    const feilLag = s().meldPa(id, { type: 'LAG', navn: 'Nytt Lag', kaptein: 'Ola', spillere: ['A'] })
    expect(feilLag.ok).toBe(false)
    const feil1v1 = s().meldPa(id, { type: 'SPILLER', navn: 'Solo' })
    expect(feil1v1.ok).toBe(false)
    const ok = s().meldPa(id, {
      type: 'LAG',
      navn: 'Nytt Lag',
      kaptein: 'Ola',
      spillere: ['A', 'B', 'C', 'D'],
    })
    expect(ok.ok).toBe(true)
    expect(s().deltakere.filter((d) => d.turneringId === id)).toHaveLength(6)
  })

  it('e-sport bo3: ugyldig kartresultat avvises, forfall gir 2–0', () => {
    const k = s().kamper.find((x) => x.turneringId === 't-esport-rr' && x.status !== 'FERDIG' && !x.erBye)!
    expect(s().lagreResultat(k.id, { A: 3, B: 0 }).ok).toBe(false)
    expect(s().lagreWalkover(k.id, 'A').ok).toBe(true)
    expect(kamp(k.id)).toMatchObject({ resultatA: 2, resultatB: 0, walkover: true })
  })
})
