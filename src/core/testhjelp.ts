import type { Deltaker, Kamp, Spillprofil, Turnering } from './types'

export function lagDeltakere(n: number, medRating = true): Deltaker[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `d${i + 1}`,
    turneringId: 't',
    type: 'SPILLER' as const,
    visningsnavn: `Spiller ${String(i + 1).padStart(2, '0')}`,
    rating: medRating ? 2000 - i * 50 : undefined,
  }))
}

export function lagTurnering(p: Partial<Turnering> & { type: Turnering['type'] }, profil: Spillprofil): Turnering {
  return {
    id: 't',
    navn: 'Test',
    spillprofilId: profil.id,
    deltakertype: 'SPILLER',
    status: 'PAGAR',
    maksDeltakere: 64,
    startdato: '2026-01-05T18:00:00.000Z',
    oppdatert: 0,
    ...p,
  }
}

export function ferdigKamp(
  id: string,
  a: string,
  b: string,
  ra: number,
  rb: number,
  ekstra: Partial<Kamp> = {},
): Kamp {
  return {
    id,
    turneringId: 't',
    runde: 1,
    deltakerAId: a,
    deltakerBId: b,
    resultatA: ra,
    resultatB: rb,
    vinnerId: ra > rb ? a : rb > ra ? b : undefined,
    walkover: false,
    erBye: false,
    tidspunkt: '2026-01-05T18:00:00.000Z',
    status: 'FERDIG',
    ...ekstra,
  }
}
