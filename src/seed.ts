import { hentProfil, profilFor } from './core/profiler'
import { genererCup, seedDeltakere } from './core/generatorer/cup'
import { genererLiga, genererRoundRobin } from './core/generatorer/rundeturnering'
import { lagRng } from './core/generatorer/rng'
import { registrerResultat, registrerWalkover } from './core/regler/resultat'
import { genererNesteRunde } from './core/regler/sveitsisk'
import { beregnStatus, kreverVinner } from './core/regler/status'
import { simulerResultat } from './core/simulering'
import type { Deltaker, Kamp, ResultatInput, Turnering } from './core/types'

export interface Data {
  turneringer: Turnering[]
  deltakere: Deltaker[]
  kamper: Kamp[]
}

const FORNAVN = ['Ola', 'Kari', 'Jonas', 'Ingrid', 'Henrik', 'Silje', 'Tobias', 'Marte', 'Anders', 'Nora', 'Emil', 'Sara', 'Lars', 'Hanne', 'Magnus', 'Ida']
const ETTERNAVN = ['Hansen', 'Berg', 'Solberg', 'Lunde', 'Moen', 'Haugen', 'Dahl', 'Strand', 'Vik', 'Eriksen', 'Nilsen', 'Bakke', 'Lie', 'Holm', 'Aas', 'Rud']

function personer(antall: number, forskyvning: number): string[] {
  return Array.from({ length: antall }, (_, i) => {
    const n = forskyvning * 5 + i
    return `${FORNAVN[(n * 3) % FORNAVN.length]} ${ETTERNAVN[(n * 7 + forskyvning) % ETTERNAVN.length]}`
  })
}

function lag(turneringId: string, idx: number, navn: string, rating: number, antallSpillere: number): Deltaker {
  const spillere = personer(antallSpillere, idx + 1)
  return {
    id: `${turneringId}-d${idx + 1}`,
    turneringId,
    type: 'LAG',
    visningsnavn: navn,
    rating,
    kaptein: spillere[0],
    spillere: spillere.slice(1),
  }
}

function spiller(turneringId: string, idx: number, navn: string, rating?: number): Deltaker {
  return { id: `${turneringId}-d${idx + 1}`, turneringId, type: 'SPILLER', visningsnavn: navn, rating }
}

const min = (d: Date, minutter: number) => new Date(d.getTime() + minutter * 60_000)
const dager = (d: Date, n: number) => min(d, n * 24 * 60)
function iDag(now: Date, time: number, minutt = 0): Date {
  const d = new Date(now)
  d.setHours(time, minutt, 0, 0)
  return d
}

export function lagSeed(now: Date = new Date()): Data {
  const turneringer: Turnering[] = []
  const deltakere: Deltaker[] = []
  let kamper: Kamp[] = []
  const rng = lagRng(2026)

  const slaaSammen = (endret: Kamp[]) => {
    kamper = kamper.map((k) => endret.find((e) => e.id === k.id) ?? k)
  }
  const ratingAv = (d: Deltaker[], id?: string) => d.find((x) => x.id === id)?.rating ?? 0

  /** Spiller en kamp med simulert resultat (eller et gitt resultat). */
  function spill(t: Turnering, d: Deltaker[], k: Kamp, input?: ResultatInput, utenRemis = false) {
    const profil = profilFor(t)
    const opts = { kreverVinner: kreverVinner(t), bestOf: t.bestOf }
    let resultat =
      input ?? simulerResultat(k, ratingAv(d, k.deltakerAId), ratingAv(d, k.deltakerBId), profil, opts, rng)
    // Gjør remis om til en vanlig seier slik at bare den planlagte kampen går til armageddon.
    if (utenRemis && resultat.A === resultat.B) resultat = { A: 1, B: 0 }
    const res = registrerResultat(k, resultat, profil, kamper, opts)
    if (!res.ok) throw new Error(`Seed feilet (${k.id}): ${res.feil}`)
    slaaSammen(res.kamper)
  }
  const hent = (id: string) => kamper.find((k) => k.id === id)!
  const spillRunde = (t: Turnering, d: Deltaker[], runde: number, ekskluder: string[] = []) => {
    for (const k of kamper.filter((x) => x.turneringId === t.id && x.runde === runde && !x.erBye && x.status !== 'FERDIG')) {
      if (!ekskluder.includes(k.id)) spill(t, d, hent(k.id))
    }
  }
  const leggTil = (t: Turnering, d: Deltaker[], nye: Kamp[]) => {
    turneringer.push(t)
    deltakere.push(...d)
    kamper.push(...nye)
  }
  const ferdigstill = (t: Turnering, d: Deltaker[]) => {
    const profil = profilFor(t)
    t.status = beregnStatus(t, kamper.filter((k) => k.turneringId === t.id), d, profil)
  }

  // ---------- 1. Sjakk-cup (8 spillere, kvartfinaler spilt, semifinaler i dag) ----------
  {
    const id = 't-sjakk-cup'
    const t: Turnering = {
      id,
      navn: 'Nome Sjakkmesterskap',
      spillprofilId: 'sjakk',
      type: 'CUP',
      deltakertype: 'SPILLER',
      status: 'PAGAR',
      maksDeltakere: 8,
      startdato: dager(now, -1).toISOString(),
      seeding: 'RATING',
      oppdatert: Date.now(),
    }
    const navn: [string, number][] = [
      ['Jonas Eriksen', 2210], ['Ingrid Solberg', 2105], ['Henrik Lunde', 2050], ['Silje Moen', 1980],
      ['Tobias Berg', 1890], ['Marte Haugen', 1820], ['Anders Dahl', 1760], ['Kari Nilsen', 1690],
    ]
    const d = navn.map(([n, r], i) => spiller(id, i, n, r))
    const rating = Object.fromEntries(d.map((x) => [x.id, x.rating!]))
    const kk = genererCup(d.map((x) => x.id), {
      turneringId: id,
      start: now.toISOString(),
      seed: 4,
      rating,
      tidspunkt: (r, i) =>
        (r === 1 ? min(iDag(now, 18), -24 * 60 + i * 60) : r === 2 ? iDag(now, 14, i * 60) : iDag(now, 18)).toISOString(),
    })
    seedDeltakere(d.map((x) => x.id), { seed: 4, rating }).forEach((did, i) => {
      d.find((x) => x.id === did)!.seed = i + 1
    })
    leggTil(t, d, kk)
    // Kvartfinale 2 ender remis → armageddon.
    for (const k of kamper.filter((x) => x.turneringId === id && x.runde === 1)) {
      if (k.id.endsWith('-c1-1')) spill(t, d, hent(k.id), { A: 0.5, B: 0.5, armageddonVinner: 'B' })
      else spill(t, d, hent(k.id), undefined, true)
    }
    ferdigstill(t, d)
  }

  // ---------- 2. Fotball-liga (6 lag, 7er, 3 av 10 runder spilt) ----------
  {
    const id = 't-fotball-liga'
    const start = dager(iDag(now, 18), -21)
    const t: Turnering = {
      id,
      navn: 'Nome Serien 7er',
      spillprofilId: 'fotball',
      type: 'LIGA',
      deltakertype: 'LAG',
      status: 'PAGAR',
      maksDeltakere: 6,
      startdato: start.toISOString(),
      rundeintervall: 7,
      lagstorrelse: 7,
      oppdatert: Date.now(),
    }
    const lagListe: [string, number][] = [
      ['Tromsø Tigers', 1500], ['Bodø Blåser', 1450], ['Trondheim Titans', 1400],
      ['Stavanger Storm', 1380], ['Oslo Ørner', 1350], ['Nome Nordlys', 1300],
    ]
    const d = lagListe.map(([n, r], i) => lag(id, i, n, r, 8))
    const kk = genererLiga(d.map((x) => x.id), { turneringId: id, start: start.toISOString(), dagerMellomRunder: 7 })
    leggTil(t, d, kk)
    const profil = hentProfil('fotball')
    spillRunde(t, d, 1)
    spillRunde(t, d, 2)
    // Runde 3: ett forfall.
    const r3 = kamper.filter((x) => x.turneringId === id && x.runde === 3)
    const wo = registrerWalkover(r3[0], 'A', profil, kamper, { erCup: false })
    if (wo.ok) slaaSammen(wo.kamper)
    spillRunde(t, d, 3)
    // Runde 4 er i dag, første kamp pågår.
    const r4 = kamper.filter((x) => x.turneringId === id && x.runde === 4)
    r4.forEach((k, i) => {
      const k2 = hent(k.id)
      k2.tidspunkt = iDag(now, 18, i * 30).toISOString()
      if (i === 0) k2.status = 'PAGAR'
    })
    ferdigstill(t, d)
  }

  // ---------- 3. E-sport alle mot alle (5 lag, bye, bo3) ----------
  {
    const id = 't-esport-rr'
    const start = min(now, -150)
    const t: Turnering = {
      id,
      navn: 'Nome E-sport Open',
      spillprofilId: 'esport',
      type: 'ALLE_MOT_ALLE',
      deltakertype: 'LAG',
      status: 'PAGAR',
      maksDeltakere: 8,
      startdato: start.toISOString(),
      minutterPerKamp: 60,
      bestOf: 3,
      lagstorrelse: 5,
      oppdatert: Date.now(),
    }
    const lagListe: [string, number][] = [
      ['Fjord Esports', 1600], ['Aurora Gaming', 1550], ['Viking Vanguard', 1500], ['Nordlys Nova', 1450], ['Polar Pulse', 1400],
    ]
    const d = lagListe.map(([n, r], i) => lag(id, i, n, r, 6))
    const kk = genererRoundRobin(d.map((x) => x.id), { turneringId: id, start: start.toISOString(), minutterPerKamp: 60 })
    leggTil(t, d, kk)
    spillRunde(t, d, 1)
    spillRunde(t, d, 2)
    spillRunde(t, d, 3)
    ferdigstill(t, d)
  }

  // ---------- 4. E-sport Swiss stage (16 lag, 3 seire videre / 3 tap ute) ----------
  {
    const id = 't-esport-swiss'
    const t: Turnering = {
      id,
      navn: 'Nome Major – Swiss stage',
      spillprofilId: 'esport',
      type: 'SVEITSISK',
      deltakertype: 'LAG',
      status: 'PAGAR',
      maksDeltakere: 16,
      startdato: min(now, -150).toISOString(),
      bestOf: 1,
      lagstorrelse: 5,
      sveitsisk: { modus: 'GRENSE', seireForVidere: 3, tapForUte: 3 },
      oppdatert: Date.now(),
    }
    const navn = ['Fjord Esports', 'Aurora Gaming', 'Viking Vanguard', 'Nordlys Nova', 'Polar Pulse', 'Fjellrev', 'Midnattsol', 'Troll Tactics', 'Rune Raiders', 'Bifrost', 'Skald', 'Draugr', 'Saga Squad', 'Hugin', 'Munin', 'Valkyrie Five']
    const d = navn.map((n, i) => lag(id, i, `${n}`, 1700 - i * 40, 6))
    turneringer.push(t)
    deltakere.push(...d)
    const profil = hentProfil('esport')
    for (let r = 1; r <= 3; r++) {
      const ny = genererNesteRunde(t, d, kamper.filter((k) => k.turneringId === id), profil, min(now, -150 + (r - 1) * 60).toISOString())
      if (!ny.ok) throw new Error(ny.feil)
      kamper.push(...ny.kamper)
      const ikkeFerdige = kamper.filter((k) => k.turneringId === id && k.runde === r && k.status !== 'FERDIG')
      // Runde 3: la siste kamp stå igjen så demoen kan fullføre den.
      const spillbare = r === 3 ? ikkeFerdige.slice(0, -1) : ikkeFerdige
      for (const k of spillbare) spill(t, d, hent(k.id))
      if (r === 3) hent(ikkeFerdige[ikkeFerdige.length - 1].id).status = 'PAGAR'
    }
    ferdigstill(t, d)
  }

  // ---------- 5. Sjakk Swiss (10 spillere, 5 runder, 3 spilt) ----------
  {
    const id = 't-sjakk-swiss'
    const t: Turnering = {
      id,
      navn: 'Nome Åpent – Sveitsisk',
      spillprofilId: 'sjakk',
      type: 'SVEITSISK',
      deltakertype: 'SPILLER',
      status: 'PAGAR',
      maksDeltakere: 12,
      startdato: dager(now, -3).toISOString(),
      sveitsisk: { modus: 'RUNDER', antallRunder: 5 },
      oppdatert: Date.now(),
    }
    const spillere: [string, number][] = [
      ['Magnus Aas', 2150], ['Hanne Holm', 2040], ['Lars Bakke', 1960], ['Sara Lie', 1900], ['Emil Rud', 1840],
      ['Ida Vik', 1790], ['Nora Strand', 1720], ['Tobias Dahl', 1660], ['Marte Lunde', 1600], ['Ola Hansen', 1540],
    ]
    const d = spillere.map(([n, r], i) => spiller(id, i, n, r))
    turneringer.push(t)
    deltakere.push(...d)
    const profil = hentProfil('sjakk')
    for (let r = 1; r <= 3; r++) {
      const ny = genererNesteRunde(t, d, kamper.filter((k) => k.turneringId === id), profil, dager(now, r - 4).toISOString())
      if (!ny.ok) throw new Error(ny.feil)
      kamper.push(...ny.kamper)
      spillRunde(t, d, r)
    }
    ferdigstill(t, d)
  }

  // ---------- 6. Ferdig fotball-cup (5er, 8 lag) ----------
  {
    const id = 't-fotball-cup'
    const t: Turnering = {
      id,
      navn: 'Nome Vårcup 5er',
      spillprofilId: 'fotball',
      type: 'CUP',
      deltakertype: 'LAG',
      status: 'PAGAR',
      maksDeltakere: 8,
      startdato: dager(now, -9).toISOString(),
      lagstorrelse: 5,
      seeding: 'RATING',
      oppdatert: Date.now(),
    }
    const navn = ['Lofoten Lynet', 'Hammerfest Hvaler', 'Alta Elg', 'Narvik Nord', 'Harstad Hauk', 'Kirkenes Kobra', 'Svolvær Seil', 'Bodø Brann']
    const d = navn.map((n, i) => lag(id, i, n, 1500 - i * 50, 6))
    const rating = Object.fromEntries(d.map((x) => [x.id, x.rating!]))
    const kk = genererCup(d.map((x) => x.id), {
      turneringId: id,
      start: dager(now, -9).toISOString(),
      seed: 9,
      rating,
      dagerMellomRunder: 3,
    })
    seedDeltakere(d.map((x) => x.id), { seed: 9, rating }).forEach((did, i) => {
      d.find((x) => x.id === did)!.seed = i + 1
    })
    leggTil(t, d, kk)
    for (let r = 1; r <= 3; r++) {
      for (const k of kamper.filter((x) => x.turneringId === id && x.runde === r && x.status !== 'FERDIG')) {
        // Finalen avgjøres på straffer.
        if (r === 3) spill(t, d, hent(k.id), { A: 2, B: 2, straffer: { A: 4, B: 3 } })
        else spill(t, d, hent(k.id))
      }
    }
    ferdigstill(t, d)
  }

  // ---------- 7. Påmelding åpen: e-sport lag-cup ----------
  {
    const id = 't-valorant-cup'
    const t: Turnering = {
      id,
      navn: 'Nome Vintercup – e-sport',
      spillprofilId: 'esport',
      type: 'CUP',
      deltakertype: 'LAG',
      status: 'PAMELDING_APEN',
      maksDeltakere: 16,
      startdato: dager(now, 9).toISOString(),
      bestOf: 3,
      lagstorrelse: 5,
      seeding: 'TILFELDIG',
      oppdatert: Date.now(),
    }
    const d = ['Svolvær Wolves', 'Kristiansund Kings', 'Ålesund Aces', 'Tønsberg Tactics', 'Gjøvik Ghosts'].map((n, i) =>
      lag(id, i, n, 1300 + i * 20, 6),
    )
    leggTil(t, d, [])
  }

  // ---------- 8. Påmelding åpen: hurtigsjakk (alle mot alle) ----------
  {
    const id = 't-hurtigsjakk'
    const t: Turnering = {
      id,
      navn: 'Hurtigsjakk-kveld',
      spillprofilId: 'sjakk',
      type: 'ALLE_MOT_ALLE',
      deltakertype: 'SPILLER',
      status: 'PAMELDING_APEN',
      maksDeltakere: 8,
      startdato: dager(iDag(now, 18), 4).toISOString(),
      minutterPerKamp: 30,
      oppdatert: Date.now(),
    }
    const d = [spiller(id, 0, 'Eirik Moen', 1750), spiller(id, 1, 'Live Haugen', 1680), spiller(id, 2, 'Sondre Berg', 1610)]
    leggTil(t, d, [])
  }

  return { turneringer, deltakere, kamper }
}
