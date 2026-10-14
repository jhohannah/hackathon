import { describe, expect, it } from 'vitest'
import { hentProfil } from '../profiler'
import { useStore } from '../../store'
import { beregnStatistikk } from './statistikk'
import { veiTilTittelen } from './vei'
import { kaarVinner } from './vinner'
import { beregnTabell } from './tabell'

const s = () => useStore.getState()

function data(id: string) {
  const t = s().turneringer.find((x) => x.id === id)!
  const kamper = s().kamper.filter((k) => k.turneringId === id)
  const deltakere = s().deltakere.filter((d) => d.turneringId === id)
  const profil = hentProfil(t.spillprofilId)
  const vinner = t.status === 'AVSLUTTET' ? kaarVinner(t, kamper, beregnTabell(kamper, deltakere, profil, t)).vinner : undefined
  return { t, kamper, deltakere, profil, vinner }
}

describe('statistikk for cup', () => {
  it('teller kamper avgjort på straffer', () => {
    s().nullstill()
    const d = data('t-fotball-cup')
    const stat = beregnStatistikk(d.kamper, d.deltakere)
    const forventet = d.kamper.filter((k) => k.status === 'FERDIG' && !k.walkover && k.avgjoring).length
    expect(forventet).toBeGreaterThan(0)
    expect(stat.avgjortPaStraffer).toBe(forventet)
    expect(stat.uavgjortProsent).toBe(0) // aldri uavgjort i cup
  })

  it('ferdig cup: vinnerens vei går gjennom alle rundene med resultat fra vinnerens side', () => {
    s().nullstill()
    const d = data('t-fotball-cup')
    expect(d.vinner).toBeTruthy()
    const veier = veiTilTittelen(d.kamper, d.deltakere, d.profil, d.vinner, true)
    expect(veier).toHaveLength(1)
    expect(veier[0].deltakerId).toBe(d.vinner)
    expect(veier[0].steg.map((x) => x.runde_kort)).toEqual(['KF', 'SF', 'F'])
    // Hvert steg er en seier, og straffer vises fra vinnerens side.
    for (const steg of veier[0].steg) expect(steg.tekst).toMatch(/^\d+–\d+( \(\d+–\d+ str\.\))?$/)
    const finale = veier[0].steg[2].tekst
    expect(finale).toMatch(/\(4–3 str\.\)/)
  })

  it('pågående cup: viser veien for lagene som fortsatt er med, ikke de utslåtte', () => {
    s().nullstill()
    const d = data('t-sjakk-cup')
    const veier = veiTilTittelen(d.kamper, d.deltakere, d.profil, undefined, false)
    const utslatt = d.kamper
      .filter((k) => k.status === 'FERDIG' && k.vinnerId)
      .map((k) => (k.deltakerAId === k.vinnerId ? k.deltakerBId : k.deltakerAId))
    expect(veier.length).toBe(d.deltakere.length - utslatt.length)
    for (const v of veier) expect(utslatt).not.toContain(v.deltakerId)
    // De som har vunnet en runde står først.
    expect(veier[0].steg.length).toBeGreaterThanOrEqual(veier[veier.length - 1].steg.length)
  })

  it('bye og walkover får egne tekster i veien', () => {
    s().nullstill()
    const d = data('t-sjakk-cup')
    const k = d.kamper.find((x) => x.runde === 1 && x.status === 'FERDIG' && x.deltakerAId && x.deltakerBId)!
    const walkover = d.kamper.map((x) => (x.id === k.id ? { ...x, walkover: true } : x))
    const veier = veiTilTittelen(walkover, d.deltakere, d.profil, undefined, false)
    expect(veier.find((v) => v.deltakerId === k.vinnerId)!.steg[0].tekst).toBe('w.o.')
    const bye = d.kamper.map((x) => (x.id === k.id ? { ...x, erBye: true, deltakerAId: k.vinnerId, deltakerBId: undefined } : x))
    const veier2 = veiTilTittelen(bye, d.deltakere, d.profil, undefined, false)
    expect(veier2.find((v) => v.deltakerId === k.vinnerId)!.steg[0].tekst).toBe('bye')
  })
})
