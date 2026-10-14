import { beforeEach, describe, expect, it } from 'vitest'
import { PROFILER, profilFor } from './core/profiler'
import { useStore } from './store'

const s = () => useStore.getState()
beforeEach(() => s().nullstill())

describe('spillet «Annet»', () => {
  it('finnes som valg, og eget navn overstyrer «Annet»', () => {
    expect(PROFILER.some((p) => p.id === 'annet')).toBe(true)
    expect(profilFor({ spillprofilId: 'annet', spillnavn: ' Bordtennis ' }).navn).toBe('Bordtennis')
    expect(profilFor({ spillprofilId: 'annet' }).navn).toBe('Annet')
    // Eget navn gjelder bare for «Annet».
    expect(profilFor({ spillprofilId: 'sjakk', spillnavn: 'Noe annet' }).navn).toBe('Sjakk')
  })

  it('kan spilles som cup fra påmelding til vinner', () => {
    const id = s().opprettTurnering({
      navn: 'Kontorets bordtennis',
      spillprofilId: 'annet',
      spillnavn: 'Bordtennis',
      type: 'CUP',
      deltakertype: 'SPILLER',
      maksDeltakere: 4,
      startdato: new Date().toISOString(),
      seeding: 'RATING',
    })
    s().settStatus(id, 'PAMELDING_APEN')
    for (const [navn, rating] of [['A', 1500], ['B', 1400], ['C', 1300], ['D', 1200]] as const) {
      expect(s().meldPa(id, { type: 'SPILLER', navn, rating }).ok).toBe(true)
    }
    expect(s().genererOppsett(id).ok).toBe(true)

    const finale = () => s().kamper.filter((k) => k.turneringId === id && k.runde === 2)[0]
    const semier = s().kamper.filter((k) => k.turneringId === id && k.runde === 1)
    expect(semier).toHaveLength(2)
    // Uavgjort i cup krever en avgjørelse.
    expect(s().lagreResultat(semier[0].id, { A: 2, B: 2 }).ok).toBe(false)
    expect(s().lagreResultat(semier[0].id, { A: 3, B: 1 }).ok).toBe(true)
    expect(s().lagreResultat(semier[1].id, { A: 0, B: 5 }).ok).toBe(true)
    expect(s().lagreResultat(finale().id, { A: 11, B: 9 }).ok).toBe(true)
    expect(s().turneringer.find((t) => t.id === id)!.status).toBe('AVSLUTTET')
  })
})

describe('«Annet» med egne regler', () => {
  it('admin velger hva som skrives inn som resultat', () => {
    const base = { spillprofilId: 'annet', spillnavn: 'Padel' }
    const mal = profilFor({ ...base, spillregler: { resultatformat: 'MAL', uavgjortTillatt: false, enhet: 'sett' } })
    expect(mal.resultatformat).toBe('MAL')
    expect(mal.uavgjortTillatt).toBe(false)
    expect(mal.malEnhet).toBe('sett')

    const sjakk = profilFor({ ...base, spillregler: { resultatformat: 'SJAKK' } })
    expect(sjakk.resultatformat).toBe('SJAKK')
    expect(sjakk.poeng).toEqual({ seier: 1, uavgjort: 0.5, tap: 0 })
    expect(sjakk.avgjoringsmetode).toBe('ARMAGEDDON')

    const kart = profilFor({ ...base, spillregler: { resultatformat: 'KART', uavgjortTillatt: true, enhet: ' ' } })
    expect(kart.resultatformat).toBe('KART')
    expect(kart.uavgjortTillatt).toBe(false) // best-of kan ikke bli uavgjort
    expect(kart.malEnhet).toBe('kart')
  })

  it('kart-format fungerer i en cup (best av 3)', () => {
    const id = s().opprettTurnering({
      navn: 'Padelcup',
      spillprofilId: 'annet',
      spillnavn: 'Padel',
      spillregler: { resultatformat: 'KART', enhet: 'sett' },
      type: 'CUP',
      deltakertype: 'SPILLER',
      maksDeltakere: 2,
      startdato: new Date().toISOString(),
      bestOf: 3,
      seeding: 'RATING',
    })
    s().settStatus(id, 'PAMELDING_APEN')
    for (const navn of ['A', 'B']) expect(s().meldPa(id, { type: 'SPILLER', navn }).ok).toBe(true)
    expect(s().genererOppsett(id).ok).toBe(true)
    const k = s().kamper.find((x) => x.turneringId === id)!
    expect(s().lagreResultat(k.id, { A: 1, B: 1 }).ok).toBe(false) // ugyldig for best av 3
    expect(s().lagreResultat(k.id, { A: 2, B: 1 }).ok).toBe(true)
    expect(s().turneringer.find((t) => t.id === id)!.status).toBe('AVSLUTTET')
  })
})
