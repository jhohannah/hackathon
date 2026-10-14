import type { Deltakertype, Spillprofil } from './types'

/** Hvilke deltakertyper kan velges for et spill? Alle turneringstyper fungerer med alle spill. */
export function kanVelgeDeltakertype(
  profil: Spillprofil,
  type: Deltakertype,
): { ok: boolean; grunn?: string } {
  if (profil.tillatteDeltakertyper.includes(type)) return { ok: true }
  return {
    ok: false,
    grunn: `${profil.navn} spilles bare ${type === 'LAG' ? '1 mot 1' : 'som lag'}.`,
  }
}
