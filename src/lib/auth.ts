import { create } from 'zustand'
import { tr } from './i18n'
import { persist } from 'zustand/middleware'

export type Rolle = 'ADMIN' | 'DELTAKER'

export interface Bruker {
  rolle: Rolle
  navn: string
  epost?: string
}

/**
 * Enkel demo-innlogging uten backend. Passordet ligger i koden og gir ingen reell sikkerhet –
 * det er bare med for å skille admin (oppretter/endrer turneringer) fra deltaker (melder seg på).
 */
export const ADMIN_PASSORD = 'admin'

export type LoggInnSvar = { ok: true } | { ok: false; feil: string }

interface Auth {
  bruker?: Bruker
  loggInnAdmin: (passord: string) => LoggInnSvar
  loggInnDeltaker: (navn: string, epost?: string) => LoggInnSvar
  loggUt: () => void
}

export const useAuth = create<Auth>()(
  persist(
    (set) => ({
      bruker: undefined,
      loggInnAdmin: (passord) => {
        if (passord !== ADMIN_PASSORD) return { ok: false, feil: tr('Feil passord.') }
        set({ bruker: { rolle: 'ADMIN', navn: 'Admin' } })
        return { ok: true }
      },
      loggInnDeltaker: (navn, epost) => {
        const n = navn.trim()
        if (n.length < 2) return { ok: false, feil: tr('Skriv inn navnet ditt (minst 2 tegn).') }
        const e = epost?.trim()
        if (e && !/^\S+@\S+\.\S+$/.test(e)) return { ok: false, feil: tr('E-postadressen ser ikke riktig ut.') }
        set({ bruker: { rolle: 'DELTAKER', navn: n, epost: e || undefined } })
        return { ok: true }
      },
      loggUt: () => set({ bruker: undefined }),
    }),
    { name: 'nome-games-auth' },
  ),
)

export const erAdmin = (b: Bruker | undefined) => b?.rolle === 'ADMIN'

/** Brukes av sider som bare skal åpnes via lokale stier (hindrer åpne videresendinger). */
export function trygSti(sti: string | null | undefined, standard: string): string {
  if (sti && sti.startsWith('/') && !sti.startsWith('//')) return sti
  return standard
}
