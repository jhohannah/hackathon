import { lagRng } from './generatorer/rng'
import type { Spillprofil, Turneringstype } from './types'

const STEDER = ['Nome', 'Nordlys', 'Midnattssol', 'Polar', 'Fjord', 'Fjell', 'Arktis', 'Nordkapp', 'Viking', 'Havørn', 'Isbre']

const TYPE_ORD: Record<Turneringstype, string[]> = {
  CUP: ['cup', 'knockout', 'utslagsduell'],
  LIGA: ['serien', 'ligaen', 'sesongen'],
  ALLE_MOT_ALLE: ['open', 'rundtur', 'allkamp'],
  SVEITSISK: ['swiss', 'swiss-open', 'swiss showdown'],
}

// Ordvalg styres av spillets kategori, ikke av spill-id.
const KATEGORI_ORD: Record<Spillprofil['kategori'], string[]> = {
  FYSISK: ['Mållinjen', 'Banekampen', 'Fotballfesten', 'Treffet'],
  BRETTSPILL: ['Kongejakten', 'Brettduellen', 'Bondestormen', 'Rokaden'],
  ESPORT: ['Arenaen', 'Respawn', 'Showdown', 'Nettkampen', 'Major'],
}

const ADJEKTIV = ['Store', 'Store Nordlige', 'Åpne', 'Arktiske', 'Ville', 'Ukens', 'Gylne']

export function sesong(dato: Date): string {
  const m = dato.getMonth() + 1
  if (m <= 2 || m === 12) return 'Vinter'
  if (m <= 5) return 'Vår'
  if (m <= 8) return 'Sommer'
  return 'Høst'
}

const storForst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Foreslår turneringsnavn ut fra spill, turneringstype og startdato. */
export function foreslaaNavn(opts: {
  profil: Spillprofil
  type: Turneringstype
  dato: Date
  antall?: number
  seed?: number
}): string[] {
  const rng = lagRng(opts.seed ?? Date.now())
  const velg = <T,>(liste: T[]) => liste[Math.floor(rng() * liste.length)]
  const antall = opts.antall ?? 5
  const ses = sesong(opts.dato)
  const aar = opts.dato.getFullYear()
  const spill = opts.profil.navn

  const maler: (() => string)[] = [
    () => `${velg(STEDER)} ${ses}${velg(TYPE_ORD[opts.type])}`,
    () => `${velg(STEDER)} ${storForst(velg(TYPE_ORD[opts.type]))} ${aar}`,
    () => `${velg(ADJEKTIV)} ${spill}${velg(TYPE_ORD[opts.type])}`,
    () => `${velg(STEDER)}-${velg(KATEGORI_ORD[opts.profil.kategori])}`,
    () => `${spill}-${ses}en ${aar}`,
    () => `${velg(STEDER)} ${spill} ${storForst(velg(TYPE_ORD[opts.type]))}`,
    () => `${ses}ens ${velg(KATEGORI_ORD[opts.profil.kategori])}`,
  ]

  const navn = new Set<string>()
  let forsok = 0
  while (navn.size < antall && forsok++ < 200) {
    navn.add(velg(maler)().replace(/\s+/g, ' ').trim())
  }
  return [...navn]
}
