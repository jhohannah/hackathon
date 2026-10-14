import type { Deltaker, Kamp, Spillprofil, Status, Turnering } from '../types'
import { antallAktive, sveitsiskInnstillinger } from './sveitsisk'

/** Cup og sveitsisk GRENSE krever alltid en vinner i hver kamp. */
export function kreverVinner(t: Turnering): boolean {
  return t.type === 'CUP' || (t.type === 'SVEITSISK' && t.sveitsisk?.modus === 'GRENSE')
}

export function erFerdig(
  t: Turnering,
  kamper: Kamp[],
  deltakere: Deltaker[],
  profil: Spillprofil,
): boolean {
  if (kamper.length === 0) return false
  if (kamper.some((k) => k.status !== 'FERDIG')) return false
  if (t.type !== 'SVEITSISK') return true
  const s = sveitsiskInnstillinger(t, deltakere.length)
  if (s.modus === 'RUNDER') {
    const maks = kamper.reduce((m, k) => Math.max(m, k.runde), 0)
    return maks >= s.antallRunder
  }
  return antallAktive(kamper, deltakere, profil, t) === 0
}

/** Status følger kampene: PAGAR når oppsett finnes, AVSLUTTET når alt er spilt. */
export function beregnStatus(
  t: Turnering,
  kamper: Kamp[],
  deltakere: Deltaker[],
  profil: Spillprofil,
): Status {
  if (kamper.length === 0) return t.status
  return erFerdig(t, kamper, deltakere, profil) ? 'AVSLUTTET' : 'PAGAR'
}
