import { sideTekst } from '../format'
import type { Deltaker, Kamp, Spillprofil } from '../types'

export interface VeiSteg {
  runde: number
  /** Kort rundenavn: F, SF, KF eller R1, R2 … */
  runde_kort: string
  /** For eksempel «2–0», «2–2 (4–3 str.)», «w.o.» eller «bye». */
  tekst: string
}

export interface Vei {
  deltakerId: string
  steg: VeiSteg[]
}

export function rundeKort(runde: number, antallRunder: number): string {
  const fraSlutt = antallRunder - runde
  if (fraSlutt === 0) return 'F'
  if (fraSlutt === 1) return 'SF'
  if (fraSlutt === 2) return 'KF'
  return `R${runde}`
}

function stegTekst(k: Kamp, id: string, profil: Spillprofil): string {
  if (k.erBye) return 'bye'
  if (k.walkover) return 'w.o.'
  const egen = k.deltakerAId === id ? k.resultatA : k.resultatB
  const motstander = k.deltakerAId === id ? k.resultatB : k.resultatA
  const grunn = `${sideTekst(egen, profil)}–${sideTekst(motstander, profil)}`
  const a = k.avgjoring
  if (a?.metode === 'STRAFFER') {
    const eget = k.deltakerAId === id ? a.A : a.B
    const deres = k.deltakerAId === id ? a.B : a.A
    return `${grunn} (${eget}–${deres} str.)`
  }
  if (a?.metode === 'ARMAGEDDON') return `${grunn} (armageddon)`
  return grunn
}

/**
 * Veien gjennom cupen: for hver deltaker som fortsatt er med (eller vinneren når cupen er ferdig),
 * rundene de har vunnet, med resultatet sett fra deres side.
 */
export function veiTilTittelen(
  kamper: Kamp[],
  deltakere: Deltaker[],
  profil: Spillprofil,
  vinnerId: string | undefined,
  ferdig: boolean,
): Vei[] {
  const antallRunder = Math.max(0, ...kamper.map((k) => k.runde))
  const ferdigeKamper = kamper.filter((k) => k.status === 'FERDIG' && (k.erBye || (k.deltakerAId && k.deltakerBId)))

  const veiFor = (id: string): Vei => ({
    deltakerId: id,
    steg: ferdigeKamper
      .filter((k) => (k.erBye ? k.deltakerAId === id : k.vinnerId === id))
      .sort((a, b) => a.runde - b.runde)
      .map((k) => ({ runde: k.runde, runde_kort: rundeKort(k.runde, antallRunder), tekst: stegTekst(k, id, profil) })),
  })

  if (ferdig) return vinnerId ? [veiFor(vinnerId)] : []

  const utslatt = new Set(
    ferdigeKamper.filter((k) => !k.erBye && k.vinnerId).flatMap((k) => (k.deltakerAId === k.vinnerId ? [k.deltakerBId!] : [k.deltakerAId!])),
  )
  return deltakere
    .filter((d) => !utslatt.has(d.id))
    .map((d) => veiFor(d.id))
    .sort((a, b) => b.steg.length - a.steg.length)
}
