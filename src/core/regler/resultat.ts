import type {
  Avgjoring,
  Kamp,
  ResultatInput,
  ResultatOpts,
  Side,
  Spillprofil,
  Svar,
} from '../types'

const feil = (f: string): Svar => ({ ok: false, feil: f })

/** Sjekker at neste cupkamp ikke allerede er spilt, og gir neste kamp med ny vinner i riktig slot. */
function flyttVidere(kamp: Kamp, alle: Kamp[], vinnerId: string | undefined): Kamp[] | string {
  if (!kamp.nesteKampId) return []
  const neste = alle.find((k) => k.id === kamp.nesteKampId)
  if (!neste) return []
  if (neste.status === 'FERDIG') {
    return 'Neste kamp er allerede spilt – resultatet kan ikke endres.'
  }
  const oppdatert: Kamp = { ...neste }
  if (kamp.nesteKampSlot === 'A') oppdatert.deltakerAId = vinnerId
  else oppdatert.deltakerBId = vinnerId
  return [oppdatert]
}

export function kartTilVinn(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1
}

export function registrerResultat(
  kamp: Kamp,
  input: ResultatInput,
  profil: Spillprofil,
  alleKamper: Kamp[],
  opts: ResultatOpts,
): Svar {
  if (kamp.erBye) return feil('Kampen er en bye og kan ikke få resultat.')
  if (!kamp.deltakerAId || !kamp.deltakerBId) {
    return feil('Kampen har ikke to deltakere ennå.')
  }
  const { A, B } = input
  if (![A, B].every((v) => Number.isFinite(v) && v >= 0)) {
    return feil('Resultatet må være tall som ikke er negative.')
  }

  if (profil.resultatformat === 'SJAKK') {
    const lovlig = [0, 0.5, 1]
    if (!lovlig.includes(A) || !lovlig.includes(B) || A + B !== 1) {
      return feil('Velg 1–0, ½–½ eller 0–1.')
    }
  } else if (profil.resultatformat === 'KART') {
    const bestOf = opts.bestOf ?? 1
    const vinn = kartTilVinn(bestOf)
    const ok =
      Number.isInteger(A) &&
      Number.isInteger(B) &&
      Math.max(A, B) === vinn &&
      Math.min(A, B) < vinn
    if (!ok) return feil(`Ugyldig kartresultat for best av ${bestOf}. Vinneren må ha ${vinn} kart.`)
  } else if (!Number.isInteger(A) || !Number.isInteger(B)) {
    return feil('Antall mål må være hele tall.')
  }

  let vinnerId: string | undefined
  let avgjoring: Avgjoring | undefined
  if (A !== B) {
    vinnerId = A > B ? kamp.deltakerAId : kamp.deltakerBId
  } else if (profil.uavgjortTillatt && !opts.kreverVinner) {
    vinnerId = undefined
  } else if (profil.avgjoringsmetode === 'EKSTRAOMGANGER_STRAFFER') {
    const s = input.straffer
    if (!s || !Number.isInteger(s.A) || !Number.isInteger(s.B) || s.A < 0 || s.B < 0 || s.A === s.B) {
      return feil('Uavgjort etter ekstraomganger: skriv inn straffeoppgjøret (må ha en vinner).')
    }
    vinnerId = s.A > s.B ? kamp.deltakerAId : kamp.deltakerBId
    avgjoring = { metode: 'STRAFFER', A: s.A, B: s.B, vinnerId }
  } else if (profil.avgjoringsmetode === 'ARMAGEDDON') {
    if (!input.armageddonVinner) return feil('Uavgjort: velg vinneren av armageddon-partiet.')
    vinnerId = input.armageddonVinner === 'A' ? kamp.deltakerAId : kamp.deltakerBId
    avgjoring = { metode: 'ARMAGEDDON', vinnerId }
  } else {
    return feil('Uavgjort er ikke tillatt i dette spillet.')
  }

  const ny: Kamp = {
    ...kamp,
    resultatA: A,
    resultatB: B,
    avgjoring,
    vinnerId,
    walkover: false,
    status: 'FERDIG',
  }
  const neste = flyttVidere(kamp, alleKamper, vinnerId)
  if (typeof neste === 'string') return feil(neste)
  return { ok: true, kamper: [ny, ...neste] }
}

/** Walkover: den som møtte får seieren med spillets walkover-score. */
export function registrerWalkover(
  kamp: Kamp,
  moette: Side | 'INGEN',
  profil: Spillprofil,
  alleKamper: Kamp[],
  opts: { bestOf?: number; erCup: boolean },
): Svar {
  if (kamp.erBye) return feil('Kampen er en bye.')
  if (!kamp.deltakerAId || !kamp.deltakerBId) return feil('Kampen har ikke to deltakere ennå.')
  if (moette === 'INGEN' && opts.erCup) {
    return feil('I en cup må minst én av deltakerne møte opp.')
  }
  const vinnerScore =
    profil.resultatformat === 'KART'
      ? kartTilVinn(opts.bestOf ?? 1)
      : profil.walkoverResultat.vinner
  const taperScore = profil.resultatformat === 'KART' ? 0 : profil.walkoverResultat.taper

  let vinnerId: string | undefined
  let resultatA = 0
  let resultatB = 0
  if (moette === 'A') {
    vinnerId = kamp.deltakerAId
    resultatA = vinnerScore
    resultatB = taperScore
  } else if (moette === 'B') {
    vinnerId = kamp.deltakerBId
    resultatA = taperScore
    resultatB = vinnerScore
  }
  const ny: Kamp = {
    ...kamp,
    resultatA,
    resultatB,
    avgjoring: undefined,
    vinnerId,
    walkover: true,
    status: 'FERDIG',
  }
  const neste = flyttVidere(kamp, alleKamper, vinnerId)
  if (typeof neste === 'string') return feil(neste)
  return { ok: true, kamper: [ny, ...neste] }
}
