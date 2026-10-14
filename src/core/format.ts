import type {
  Deltakertype,
  Kamp,
  KolonneId,
  Side,
  Spillprofil,
  Status,
  Turneringstype,
} from './types'

export const TYPE_NAVN: Record<Turneringstype, string> = {
  CUP: 'Cup',
  LIGA: 'Liga',
  ALLE_MOT_ALLE: 'Alle mot alle',
  SVEITSISK: 'Swiss stage',
}

export const TYPE_BESKRIVELSE: Record<Turneringstype, string> = {
  CUP: 'Utslagsturnering med brakett.',
  LIGA: 'Sesong der alle møter alle to ganger, over flere uker.',
  ALLE_MOT_ALLE: 'Alle møter alle én gang, vanligvis på én dag.',
  SVEITSISK: 'Like gode møtes hver runde. Passer for e-sport og sjakk.',
}

export const DELTAKERTYPE_NAVN: Record<Deltakertype, string> = {
  LAG: 'Lag',
  SPILLER: '1 mot 1',
}

export const STATUS_NAVN: Record<Status, string> = {
  KOMMER: 'Kommer',
  PAMELDING_APEN: 'Påmelding åpen',
  PAGAR: 'Pågår',
  AVSLUTTET: 'Avsluttet',
}

export const KOLONNE_NAVN: Record<KolonneId, string> = {
  S: 'K',
  V: 'S',
  U: 'U',
  T: 'T',
  MAL: 'Mål',
  DIFF: '+/-',
  P: 'P',
  SB: 'SB',
  BH: 'BH',
}

export const KOLONNE_TITTEL: Record<KolonneId, string> = {
  S: 'Kamper',
  V: 'Seier',
  U: 'Uavgjort',
  T: 'Tap',
  MAL: 'Mål/kart for–mot',
  DIFF: 'Forskjell',
  P: 'Poeng',
  SB: 'Sonneborn-Berger',
  BH: 'Buchholz',
}

/** Tall til visning. Sjakk viser ½. */
export function tallTekst(v: number): string {
  if (Number.isInteger(v)) return String(v)
  const hel = Math.floor(v)
  return `${hel === 0 ? '' : hel}½`
}

export function sideTekst(v: number | undefined, profil: Spillprofil): string {
  if (v === undefined) return '–'
  return profil.resultatformat === 'SJAKK' ? tallTekst(v) : String(v)
}

export function visResultat(k: Kamp, profil: Spillprofil): string {
  if (k.resultatA === undefined || k.resultatB === undefined) return '–'
  return `${sideTekst(k.resultatA, profil)}–${sideTekst(k.resultatB, profil)}`
}

export function avgjoringTekst(k: Kamp): string | undefined {
  if (k.walkover) return 'w.o.'
  if (k.avgjoring?.metode === 'STRAFFER') return `${k.avgjoring.A}–${k.avgjoring.B} e.str.`
  if (k.avgjoring?.metode === 'ARMAGEDDON') return 'Armageddon'
  return undefined
}

export function sideNavn(profil: Spillprofil, side: Side): string {
  return profil.sideNavn[side]
}

export function rundeNavn(runde: number, antallRunder: number): string {
  const fraSlutt = antallRunder - runde
  if (fraSlutt === 0) return 'Finale'
  if (fraSlutt === 1) return 'Semifinale'
  if (fraSlutt === 2) return 'Kvartfinale'
  return `Runde ${runde}`
}
