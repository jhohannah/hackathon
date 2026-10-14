// Felles kontrakt for hele appen. Se SPEC.md §1, §8, §9.
// Merk: i frontend-versjonen er Spiller/Lag slått sammen i Deltaker.

export type Deltakertype = 'LAG' | 'SPILLER'
export type Turneringstype = 'CUP' | 'LIGA' | 'ALLE_MOT_ALLE' | 'SVEITSISK'
export type Status = 'KOMMER' | 'PAMELDING_APEN' | 'PAGAR' | 'AVSLUTTET'
export type KampStatus = 'PLANLAGT' | 'PAGAR' | 'FERDIG'
export type Resultatformat = 'MAL' | 'SJAKK' | 'KART'
export type Avgjoringsmetode = 'EKSTRAOMGANGER_STRAFFER' | 'ARMAGEDDON' | 'INGEN'
export type IkonId = 'SJAKK' | 'FOTBALL' | 'ESPORT' | 'ANNET'
export type Kategori = 'FYSISK' | 'BRETTSPILL' | 'ESPORT' | 'ANNET'
export type Side = 'A' | 'B'

export type TiebreakerId =
  | 'DIFF' // målforskjell / kartforskjell
  | 'SCORET' // mål scoret
  | 'INNBYRDES'
  | 'SB' // Sonneborn-Berger
  | 'SEIRE'
  | 'SVART' // antall kamper på side B (svart)
  | 'BUCHHOLZ'
  | 'BUCHHOLZ_CUT1'

export type KolonneId = 'S' | 'V' | 'U' | 'T' | 'MAL' | 'DIFF' | 'P' | 'SB' | 'BH'

export interface Poeng {
  seier: number
  uavgjort: number
  tap: number
}

export interface Spillprofil {
  id: string
  navn: string
  ikon: IkonId
  kategori: Kategori
  tillatteDeltakertyper: Deltakertype[]
  lagstorrelse?: { min: number; max: number }
  reserver?: number
  resultatformat: Resultatformat
  uavgjortTillatt: boolean
  avgjoringsmetode: Avgjoringsmetode
  poeng: Poeng
  /** Walkover-score. For KART brukes flertallet av best-of i stedet. */
  walkoverResultat: { vinner: number; taper: number }
  /** Rekkefølge etter poeng (poeng er alltid først). */
  tiebreakers: TiebreakerId[]
  tiebreakersPerType?: Partial<Record<Turneringstype, TiebreakerId[]>>
  tabellkolonner: KolonneId[]
  sideNavn: { A: string; B: string }
  malEnhet: string
}

export interface SveitsiskInnstillinger {
  modus: 'RUNDER' | 'GRENSE'
  antallRunder?: number
  seireForVidere?: number
  tapForUte?: number
  byePoeng?: number
}

/** Regler admin velger selv for spillet «Annet». */
export interface Spillregler {
  /** Hva som skrives inn som resultat: poengsum/mål, seier/remis/tap eller kart/sett. */
  resultatformat: Resultatformat
  /** Bare for poengsum/mål: kan en kamp ende uavgjort? */
  uavgjortTillatt?: boolean
  /** Hva det telles i, f.eks. «poeng», «sett» eller «mål». */
  enhet?: string
}

export interface Turnering {
  id: string
  navn: string
  spillprofilId: string
  /** Eget navn på spillet. Brukes når spillet er «Annet». */
  spillnavn?: string
  spillregler?: Spillregler
  type: Turneringstype
  deltakertype: Deltakertype
  status: Status
  maksDeltakere: number
  startdato: string // ISO
  rundeintervall?: number // dager (liga)
  minutterPerKamp?: number // alle mot alle
  bestOf?: number
  lagstorrelse?: number
  poengOverstyring?: Poeng
  seeding?: 'RATING' | 'TILFELDIG' | 'MANUELL'
  sveitsisk?: SveitsiskInnstillinger
  oppdatert: number
}

export interface Deltaker {
  id: string
  turneringId: string
  type: Deltakertype
  visningsnavn: string
  rating?: number
  /** Seed i cup (1 = best). Settes når braketten genereres. */
  seed?: number
  kaptein?: string
  spillere?: string[]
  epost?: string
}

export interface Avgjoring {
  metode: 'STRAFFER' | 'ARMAGEDDON'
  A?: number
  B?: number
  vinnerId: string
}

export interface Kamp {
  id: string
  turneringId: string
  runde: number
  deltakerAId?: string
  deltakerBId?: string
  resultatA?: number
  resultatB?: number
  avgjoring?: Avgjoring
  vinnerId?: string
  walkover: boolean
  erBye: boolean
  tidspunkt: string // ISO
  status: KampStatus
  nesteKampId?: string
  nesteKampSlot?: Side
}

export interface ResultatInput {
  A: number
  B: number
  straffer?: { A: number; B: number }
  armageddonVinner?: Side
}

export interface ResultatOpts {
  kreverVinner: boolean
  bestOf?: number
}

export type Svar = { ok: true; kamper: Kamp[] } | { ok: false; feil: string }

export interface Tabellrad {
  deltakerId: string
  navn: string
  spilt: number
  seire: number
  uavgjort: number
  tap: number
  malFor: number
  malMot: number
  diff: number
  poeng: number
  sb: number
  bh: number
  bh1: number
  svart: number
  plass: number
}

export interface Pallen {
  vinner?: string
  andre?: string
  tredje?: string[]
  videre?: string[]
}

export interface Statistikk {
  spilt: number
  gjenstaar: number
  totaltMal: number
  snittMal: number
  storsteSeier?: { kampId: string; diff: number }
  walkovers: number
  uavgjortProsent: number
  /** Kamper avgjort på straffer (eller armageddon i sjakk). */
  avgjortPaStraffer: number
  sideA: number
  sideB: number
  form: Record<string, ('S' | 'U' | 'T')[]>
  lengsteSeiersrekke?: { deltakerId: string; antall: number }
}
