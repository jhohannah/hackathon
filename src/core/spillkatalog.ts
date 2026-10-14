import type { Spillregler, Turnering } from './types'

/** Regelsett («profil») et spill i katalogen bruker. Nye spill uten egne regler bruker «annet». */
export type KatalogProfil = 'sjakk' | 'fotball' | 'esport' | 'annet'

export interface SpillOppforing {
  navn: string
  /** 0–100. Høyere = mer populært, og havner øverst i søket. */
  popularitet: number
  /** Andre navn man kan søke på (engelsk, forkortelser …). */
  alias?: string[]
  profil: KatalogProfil
  /** Forhåndsvalgte regler for «annet» (resultatformat osv.). */
  regler?: Spillregler
  /** true = spillet bruker profilens eget navn (Sjakk, Fotball, E-sport), ellers lagres navnet på turneringen. */
  generisk?: boolean
}

const sett = (enhet = 'sett'): Spillregler => ({ resultatformat: 'KART', enhet })
const maal = (uavgjortTillatt = true, enhet = 'mål'): Spillregler => ({ resultatformat: 'MAL', uavgjortTillatt, enhet })
const poeng = (uavgjortTillatt = true): Spillregler => ({ resultatformat: 'MAL', uavgjortTillatt, enhet: 'poeng' })
const brett: Spillregler = { resultatformat: 'SJAKK' }

const e = (navn: string, popularitet: number, profil: KatalogProfil, ekstra: Partial<SpillOppforing> = {}): SpillOppforing => ({
  navn,
  popularitet,
  profil,
  ...ekstra,
})

/**
 * Spill og idretter man kan opprette turnering i. Mangler et spill, kan man sende forespørsel.
 * Fotball, sjakk og e-sport har egne regelsett, resten bruker «annet» med fornuftige standardvalg.
 */
export const SPILLKATALOG: SpillOppforing[] = [
  e('Fotball', 100, 'fotball', { alias: ['football', 'soccer'], generisk: true }),
  e('Basketball', 92, 'annet', { alias: ['basket'], regler: poeng(false) }),
  e('Sjakk', 90, 'sjakk', { alias: ['chess', 'hurtigsjakk', 'lynsjakk'], generisk: true }),
  e('E-sport', 89, 'esport', { alias: ['esport', 'esports', 'gaming', 'dataspill'], generisk: true }),
  e('Tennis', 86, 'annet', { regler: sett() }),
  e('Volleyball', 82, 'annet', { regler: sett() }),
  e('Håndball', 80, 'annet', { alias: ['handball'], regler: maal() }),
  e('Bordtennis', 77, 'annet', { alias: ['table tennis', 'ping pong'], regler: sett() }),
  e('Badminton', 74, 'annet', { regler: sett() }),
  e('Padel', 72, 'annet', { regler: sett() }),
  e('Ishockey', 70, 'annet', { alias: ['ice hockey', 'hockey'], regler: maal() }),
  e('Golf', 66, 'annet', { regler: poeng() }),
  e('Counter-Strike 2', 71, 'esport', { alias: ['cs2', 'cs go', 'csgo', 'counter strike'] }),
  e('EA Sports FC', 68, 'esport', { alias: ['fifa', 'ea fc', 'fc 25', 'fc 24'] }),
  e('Valorant', 67, 'esport'),
  e('League of Legends', 66, 'esport', { alias: ['lol'] }),
  e('Fortnite', 64, 'esport'),
  e('Call of Duty', 52, 'esport', { alias: ['cod', 'warzone'] }),
  e('Rocket League', 56, 'esport'),
  e('Dota 2', 58, 'esport', { alias: ['dota'] }),
  e('Mario Kart', 50, 'esport'),
  e('Super Smash Bros', 46, 'esport', { alias: ['smash'] }),
  e('Overwatch', 45, 'esport'),
  e('Apex Legends', 44, 'esport', { alias: ['apex'] }),
  e('Rainbow Six Siege', 36, 'esport', { alias: ['r6', 'rainbow six'] }),
  e('Tetris', 30, 'esport'),
  e('Bowling', 58, 'annet', { regler: poeng() }),
  e('Biljard', 56, 'annet', { alias: ['pool', 'snooker'], regler: poeng(false) }),
  e('Dart', 55, 'annet', { alias: ['darts', 'pil'], regler: sett() }),
  e('Friidrett', 60, 'annet', { alias: ['athletics'], regler: poeng() }),
  e('Futsal', 53, 'annet', { regler: maal() }),
  e('Innebandy', 51, 'annet', { alias: ['floorball'], regler: maal() }),
  e('Rugby', 50, 'annet', { regler: poeng() }),
  e('Amerikansk fotball', 49, 'annet', { alias: ['american football', 'nfl'], regler: poeng(false) }),
  e('Baseball', 48, 'annet', { regler: poeng(false) }),
  e('Cricket', 47, 'annet', { regler: poeng() }),
  e('Sandvolleyball', 46, 'annet', { alias: ['beach volleyball'], regler: sett() }),
  e('Squash', 45, 'annet', { regler: sett() }),
  e('Pickleball', 43, 'annet', { regler: sett() }),
  e('Boksing', 44, 'annet', { alias: ['boxing'], regler: poeng(false) }),
  e('Bryting', 41, 'annet', { alias: ['wrestling'], regler: poeng(false) }),
  e('Judo', 40, 'annet', { regler: poeng(false) }),
  e('Bandy', 38, 'annet', { regler: maal() }),
  e('Curling', 37, 'annet', { regler: poeng(false) }),
  e('Frisbee', 35, 'annet', { alias: ['ultimate frisbee', 'ultimate'], regler: poeng(false) }),
  e('Frisbeegolf', 34, 'annet', { alias: ['disc golf', 'frisbee golf'], regler: poeng() }),
  e('Kubb', 29, 'annet', { regler: poeng(false) }),
  e('Petanque', 25, 'annet', { alias: ['boccia', 'boule'], regler: poeng(false) }),
  e('Fekting', 20, 'annet', { alias: ['fencing'], regler: poeng(false) }),
  e('Poker', 42, 'annet', { regler: poeng(false) }),
  e('Yatzy', 31, 'annet', { regler: poeng() }),
  e('Backgammon', 28, 'annet', { regler: poeng(false) }),
  e('Go', 27, 'annet', { alias: ['baduk', 'weiqi'], regler: brett }),
  e('Dam', 24, 'annet', { alias: ['checkers', 'draughts'], regler: brett }),
  e('Bridge', 22, 'annet', { regler: poeng() }),
  e('Monopol', 26, 'annet', { alias: ['monopoly'], regler: poeng(false) }),
  e('Kortspill', 23, 'annet', { alias: ['cards'], regler: poeng(false) }),
  e('Brettspill', 21, 'annet', { alias: ['board games'], regler: poeng(false) }),
]

/** Små bokstaver uten aksenter, så «F» og «f» (og «å»/«a») er likt i søk. */
export function normaliser(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase('nb-NO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** 0 = starter med søket, 1 = et ord starter med søket, 2 = inneholder søket. */
function treffGrad(termer: string[], q: string): number | undefined {
  let best: number | undefined
  for (const t of termer) {
    const n = normaliser(t)
    let grad: number | undefined
    if (n.startsWith(q)) grad = 0
    else if (n.split(/[\s\-–/]+/).some((ord) => ord.startsWith(q))) grad = 1
    else if (n.includes(q)) grad = 2
    if (grad !== undefined && (best === undefined || grad < best)) best = grad
  }
  return best
}

/**
 * Søker i katalogen. Uavhengig av store/små bokstaver. Treff som starter med søket kommer først,
 * og innen hver gruppe rangeres spillene etter popularitet. Tomt søk gir de mest populære.
 */
export function sokSpill(sok: string, grense = 8, katalog: SpillOppforing[] = SPILLKATALOG): SpillOppforing[] {
  const q = normaliser(sok)
  const rangert = (a: SpillOppforing, b: SpillOppforing) => b.popularitet - a.popularitet || a.navn.localeCompare(b.navn, 'nb-NO')
  if (!q) return [...katalog].sort(rangert).slice(0, grense)
  return katalog
    .map((o) => ({ o, grad: treffGrad([o.navn, ...(o.alias ?? [])], q) }))
    .filter((x): x is { o: SpillOppforing; grad: number } => x.grad !== undefined)
    .sort((a, b) => a.grad - b.grad || rangert(a.o, b.o))
    .slice(0, grense)
    .map((x) => x.o)
}

/** Navnet som lagres på turneringen (ikke for Sjakk, Fotball og generell E-sport). */
export const spillnavnFor = (o: SpillOppforing): string | undefined => (o.generisk ? undefined : o.navn)

/** Samme spill = samme nøkkel. Brukes til å filtrere turneringer på spill. */
export function spillNokkel(t: Pick<Turnering, 'spillprofilId' | 'spillnavn'>): string {
  const navn = t.spillnavn?.trim()
  return navn ? `navn:${normaliser(navn)}` : `profil:${t.spillprofilId}`
}

export function oppforingNokkel(o: SpillOppforing): string {
  return spillNokkel({ spillprofilId: o.profil, spillnavn: spillnavnFor(o) })
}
