import type { Deltaker, Deltakertype, Spillprofil, Turnering } from '../types'

export interface PameldingInput {
  type: Deltakertype
  navn: string
  rating?: number
  kaptein?: string
  spillere?: string[]
  epost?: string
}

/** Lagets lovlige størrelse for en turnering (inkl. reserver). */
export function lagGrenser(t: Turnering, p: Spillprofil): { min: number; max: number } {
  if (t.lagstorrelse) return { min: t.lagstorrelse, max: t.lagstorrelse + (p.reserver ?? 0) }
  return p.lagstorrelse ?? { min: 1, max: 1 }
}

export type PameldingFeil = Partial<Record<'generelt' | 'type' | 'navn' | 'kaptein' | 'spillere' | 'rating', string>>

export function validerPamelding(
  input: PameldingInput,
  turnering: Turnering,
  profil: Spillprofil,
  eksisterende: Deltaker[],
): PameldingFeil {
  const feil: PameldingFeil = {}
  if (turnering.status !== 'PAMELDING_APEN') {
    feil.generelt = 'Påmeldingen er ikke åpen for denne turneringen.'
  }
  if (!profil.tillatteDeltakertyper.includes(input.type)) {
    feil.type = `${profil.navn} kan ikke spilles som ${input.type === 'LAG' ? 'lag' : '1 mot 1'}.`
  } else if (input.type !== turnering.deltakertype) {
    feil.type = `Denne turneringen er kun for ${turnering.deltakertype === 'LAG' ? 'lag' : '1 mot 1'}.`
  }
  if (eksisterende.length >= turnering.maksDeltakere) {
    feil.generelt = `Turneringen er full (maks ${turnering.maksDeltakere} deltakere).`
  }
  const navn = input.navn.trim()
  if (!navn) feil.navn = 'Navn må fylles ut.'
  else if (eksisterende.some((d) => d.visningsnavn.toLowerCase() === navn.toLowerCase())) {
    feil.navn = 'Dette navnet er allerede påmeldt.'
  }

  if (input.type === 'LAG') {
    if (!input.kaptein?.trim()) feil.kaptein = 'Lagkaptein må fylles ut.'
    const spillere = (input.spillere ?? []).map((s) => s.trim()).filter(Boolean)
    const antall = (input.kaptein?.trim() ? 1 : 0) + spillere.length
    const g = lagGrenser(turnering, profil)
    if (antall < g.min || antall > g.max) {
      feil.spillere = `Laget må ha mellom ${g.min} og ${g.max} spillere (kapteinen medregnet). Nå: ${antall}.`
    }
  } else if (input.rating !== undefined && !(input.rating >= 0 && input.rating <= 4000)) {
    feil.rating = 'Rating må være et tall mellom 0 og 4000.'
  }
  return feil
}

export function harFeil(f: PameldingFeil): boolean {
  return Object.keys(f).length > 0
}
