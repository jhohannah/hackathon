import { describe, expect, it } from 'vitest'
import { SPILLKATALOG, normaliser, oppforingNokkel, sokSpill, spillNokkel, spillnavnFor } from './spillkatalog'
import { profilFor } from './profiler'

describe('spillsøk', () => {
  it('«f» gir fotball øverst, uansett store/små bokstaver', () => {
    for (const q of ['f', 'F', ' f ']) {
      const treff = sokSpill(q)
      expect(treff[0].navn).toBe('Fotball')
      expect(treff.length).toBeGreaterThan(1)
    }
  })

  it('treff som starter med søket rangeres før treff inni ordet, og etter popularitet', () => {
    const treff = sokSpill('ba')
    const navn = treff.map((t) => t.navn)
    expect(navn[0]).toBe('Basketball') // mest populære som starter på «ba»
    expect(navn.indexOf('Badminton')).toBeLessThan(navn.indexOf('Backgammon') === -1 ? 99 : navn.indexOf('Backgammon') + 1)
    // Alle «starter med»-treff kommer før treff som bare inneholder søket.
    const forste = (n: string) => normaliser(n).startsWith('ba')
    const grense = navn.findIndex((n) => !forste(n))
    if (grense !== -1) expect(navn.slice(grense).every((n) => !forste(n))).toBe(true)
    const pop = treff.filter((t) => forste(t.navn)).map((t) => t.popularitet)
    expect([...pop].sort((a, b) => b - a)).toEqual(pop)
  })

  it('finner på engelske navn og aliaser', () => {
    expect(sokSpill('soccer')[0].navn).toBe('Fotball')
    expect(sokSpill('chess')[0].navn).toBe('Sjakk')
    expect(sokSpill('lol')[0].navn).toBe('League of Legends')
    expect(sokSpill('håndb')[0].navn).toBe('Håndball')
    expect(sokSpill('handb')[0].navn).toBe('Håndball')
  })

  it('tomt søk gir de mest populære, og ukjente spill gir ingen treff', () => {
    const topp = sokSpill('')
    expect(topp[0].navn).toBe('Fotball')
    expect(topp.map((t) => t.popularitet)).toEqual([...topp.map((t) => t.popularitet)].sort((a, b) => b - a))
    expect(sokSpill('qwxzy')).toEqual([])
  })

  it('katalogen har unike navn og gyldige regler', () => {
    const navn = SPILLKATALOG.map((o) => normaliser(o.navn))
    expect(new Set(navn).size).toBe(navn.length)
    for (const o of SPILLKATALOG) {
      expect(o.popularitet).toBeGreaterThan(0)
      expect(o.popularitet).toBeLessThanOrEqual(100)
    }
  })

  it('nøkler skiller spill, og e-sport-titler får egen profil med eget navn', () => {
    const valorant = SPILLKATALOG.find((o) => o.navn === 'Valorant')!
    expect(valorant.profil).toBe('esport')
    expect(spillnavnFor(valorant)).toBe('Valorant')
    expect(profilFor({ spillprofilId: 'esport', spillnavn: 'Valorant' }).navn).toBe('Valorant')
    expect(oppforingNokkel(valorant)).toBe(spillNokkel({ spillprofilId: 'esport', spillnavn: 'valorant' }))
    const fotball = SPILLKATALOG.find((o) => o.navn === 'Fotball')!
    expect(oppforingNokkel(fotball)).toBe(spillNokkel({ spillprofilId: 'fotball' }))
    expect(oppforingNokkel(fotball)).not.toBe(oppforingNokkel(valorant))
  })
})
