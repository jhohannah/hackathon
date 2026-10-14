import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { profilFor } from './core/profiler'
import { genererCup, seedDeltakere } from './core/generatorer/cup'
import { genererLiga, genererRoundRobin } from './core/generatorer/rundeturnering'
import { registrerResultat, registrerWalkover } from './core/regler/resultat'
import { genererNesteRunde } from './core/regler/sveitsisk'
import { beregnStatus, kreverVinner } from './core/regler/status'
import {
  harFeil,
  validerPamelding,
  type PameldingFeil,
  type PameldingInput,
} from './core/regler/pamelding'
import type {
  Deltaker,
  Kamp,
  KampStatus,
  ResultatInput,
  Side,
  Status,
  Turnering,
} from './core/types'
import { lagSeed } from './seed'

export type Resultat = { ok: true } | { ok: false; feil: string }

interface State {
  turneringer: Turnering[]
  deltakere: Deltaker[]
  kamper: Kamp[]
  sistOppdatert: number

  opprettTurnering: (t: Omit<Turnering, 'id' | 'oppdatert' | 'status'> & { status?: Status }) => string
  settStatus: (turneringId: string, status: Status) => void
  meldPa: (turneringId: string, input: PameldingInput) => { ok: true } | { ok: false; feil: PameldingFeil }
  fjernDeltaker: (deltakerId: string) => void
  /** Flytter en deltaker opp (-1) eller ned (+1) i seedingrekkefølgen (manuell seeding). */
  flyttDeltaker: (deltakerId: string, retning: -1 | 1) => void
  genererOppsett: (turneringId: string) => Resultat
  nesteRunde: (turneringId: string) => Resultat
  lagreResultat: (kampId: string, input: ResultatInput) => Resultat
  lagreWalkover: (kampId: string, moette: Side | 'INGEN') => Resultat
  settKampStatus: (kampId: string, status: KampStatus) => void
  nullstill: () => void
}

export const STORAGE_NOKKEL = 'nome-games-v1'

function nyttId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

const startData = () => lagSeed()

/** Setter status ut fra kampene og oppdaterer tidsstempelet. */
function medStatus(t: Turnering, kamper: Kamp[], deltakere: Deltaker[]): Turnering {
  const profil = profilFor(t)
  return {
    ...t,
    status: beregnStatus(
      t,
      kamper.filter((k) => k.turneringId === t.id),
      deltakere.filter((d) => d.turneringId === t.id),
      profil,
    ),
    oppdatert: Date.now(),
  }
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...startData(),
      sistOppdatert: Date.now(),

      opprettTurnering: (t) => {
        const id = nyttId('t')
        const ny: Turnering = { ...t, id, status: t.status ?? 'PAMELDING_APEN', oppdatert: Date.now() }
        set((s) => ({ turneringer: [ny, ...s.turneringer], sistOppdatert: Date.now() }))
        return id
      },

      settStatus: (turneringId, status) =>
        set((s) => ({
          turneringer: s.turneringer.map((t) =>
            t.id === turneringId ? { ...t, status, oppdatert: Date.now() } : t,
          ),
          sistOppdatert: Date.now(),
        })),

      meldPa: (turneringId, input) => {
        const s = get()
        const t = s.turneringer.find((x) => x.id === turneringId)
        if (!t) return { ok: false, feil: { generelt: 'Fant ikke turneringen.' } }
        const profil = profilFor(t)
        const eksisterende = s.deltakere.filter((d) => d.turneringId === turneringId)
        const feil = validerPamelding(input, t, profil, eksisterende)
        if (harFeil(feil)) return { ok: false, feil }
        const spillere = (input.spillere ?? []).map((x) => x.trim()).filter(Boolean)
        const ny: Deltaker = {
          id: nyttId(`${turneringId}-d`),
          turneringId,
          type: input.type,
          visningsnavn: input.navn.trim(),
          rating: input.rating,
          kaptein: input.type === 'LAG' ? input.kaptein?.trim() : undefined,
          spillere: input.type === 'LAG' ? spillere : undefined,
          epost: input.epost?.trim() || undefined,
        }
        set((st) => ({
          deltakere: [...st.deltakere, ny],
          turneringer: st.turneringer.map((x) => (x.id === turneringId ? { ...x, oppdatert: Date.now() } : x)),
          sistOppdatert: Date.now(),
        }))
        return { ok: true }
      },

      fjernDeltaker: (deltakerId) =>
        set((s) => ({
          deltakere: s.deltakere.filter((d) => d.id !== deltakerId),
          sistOppdatert: Date.now(),
        })),

      flyttDeltaker: (deltakerId, retning) =>
        set((s) => {
          const d = s.deltakere.find((x) => x.id === deltakerId)
          if (!d) return s
          const alle = s.deltakere.filter((x) => x.turneringId === d.turneringId)
          const i = alle.findIndex((x) => x.id === deltakerId)
          const j = i + retning
          if (j < 0 || j >= alle.length) return s
          const ny = [...alle]
          ;[ny[i], ny[j]] = [ny[j], ny[i]]
          const andre = s.deltakere.filter((x) => x.turneringId !== d.turneringId)
          return { deltakere: [...andre, ...ny], sistOppdatert: Date.now() }
        }),

      genererOppsett: (turneringId) => {
        const s = get()
        const t = s.turneringer.find((x) => x.id === turneringId)
        if (!t) return { ok: false, feil: 'Fant ikke turneringen.' }
        const d = s.deltakere.filter((x) => x.turneringId === turneringId)
        if (d.length < 2) return { ok: false, feil: 'Minst 2 deltakere trengs for å generere oppsett.' }
        if (s.kamper.some((k) => k.turneringId === turneringId)) {
          return { ok: false, feil: 'Oppsettet er allerede generert.' }
        }
        const ids = d.map((x) => x.id)
        const start = t.startdato
        let nye: Kamp[]
        let deltakere = s.deltakere
        if (t.type === 'CUP') {
          // Manuell seeding følger rekkefølgen i listen; rating følger rating; ellers tilfeldig.
          const rating =
            t.seeding === 'MANUELL'
              ? Object.fromEntries(d.map((x, i) => [x.id, d.length - i]))
              : t.seeding === 'TILFELDIG'
                ? undefined
                : Object.fromEntries(d.map((x) => [x.id, x.rating ?? 0]))
          nye = genererCup(ids, { turneringId: t.id, start, rating, seed: 7 })
          const seedet = seedDeltakere(ids, { seed: 7, rating })
          deltakere = s.deltakere.map((x) =>
            x.turneringId === t.id ? { ...x, seed: seedet.indexOf(x.id) + 1 } : x,
          )
        } else if (t.type === 'LIGA') {
          nye = genererLiga(ids, { turneringId: t.id, start, dagerMellomRunder: t.rundeintervall ?? 7 })
        } else if (t.type === 'ALLE_MOT_ALLE') {
          nye = genererRoundRobin(ids, { turneringId: t.id, start, minutterPerKamp: t.minutterPerKamp ?? 45 })
        } else {
          const res = genererNesteRunde(t, d, [], profilFor(t), start)
          if (!res.ok) return res
          nye = res.kamper
        }
        const kamper = [...s.kamper, ...nye]
        set({
          kamper,
          deltakere,
          turneringer: s.turneringer.map((x) =>
            x.id === t.id ? { ...medStatus(x, kamper, deltakere), status: 'PAGAR' } : x,
          ),
          sistOppdatert: Date.now(),
        })
        return { ok: true }
      },

      nesteRunde: (turneringId) => {
        const s = get()
        const t = s.turneringer.find((x) => x.id === turneringId)
        if (!t) return { ok: false, feil: 'Fant ikke turneringen.' }
        const d = s.deltakere.filter((x) => x.turneringId === turneringId)
        const k = s.kamper.filter((x) => x.turneringId === turneringId)
        const res = genererNesteRunde(t, d, k, profilFor(t), new Date().toISOString())
        if (!res.ok) return res
        const kamper = [...s.kamper, ...res.kamper]
        set({
          kamper,
          turneringer: s.turneringer.map((x) => (x.id === t.id ? medStatus(x, kamper, s.deltakere) : x)),
          sistOppdatert: Date.now(),
        })
        return { ok: true }
      },

      lagreResultat: (kampId, input) => {
        const s = get()
        const kamp = s.kamper.find((k) => k.id === kampId)
        if (!kamp) return { ok: false, feil: 'Fant ikke kampen.' }
        const t = s.turneringer.find((x) => x.id === kamp.turneringId)!
        const profil = profilFor(t)
        const res = registrerResultat(kamp, input, profil, s.kamper, {
          kreverVinner: kreverVinner(t),
          bestOf: t.bestOf,
        })
        if (!res.ok) return res
        const kamper = s.kamper.map((k) => res.kamper.find((e) => e.id === k.id) ?? k)
        set({
          kamper,
          turneringer: s.turneringer.map((x) => (x.id === t.id ? medStatus(x, kamper, s.deltakere) : x)),
          sistOppdatert: Date.now(),
        })
        return { ok: true }
      },

      lagreWalkover: (kampId, moette) => {
        const s = get()
        const kamp = s.kamper.find((k) => k.id === kampId)
        if (!kamp) return { ok: false, feil: 'Fant ikke kampen.' }
        const t = s.turneringer.find((x) => x.id === kamp.turneringId)!
        const profil = profilFor(t)
        const res = registrerWalkover(kamp, moette, profil, s.kamper, {
          bestOf: t.bestOf,
          erCup: kreverVinner(t),
        })
        if (!res.ok) return res
        const kamper = s.kamper.map((k) => res.kamper.find((e) => e.id === k.id) ?? k)
        set({
          kamper,
          turneringer: s.turneringer.map((x) => (x.id === t.id ? medStatus(x, kamper, s.deltakere) : x)),
          sistOppdatert: Date.now(),
        })
        return { ok: true }
      },

      settKampStatus: (kampId, status) =>
        set((s) => {
          const kamp = s.kamper.find((k) => k.id === kampId)
          return {
            kamper: s.kamper.map((k) => (k.id === kampId ? { ...k, status } : k)),
            turneringer: s.turneringer.map((t) =>
              t.id === kamp?.turneringId ? { ...t, oppdatert: Date.now() } : t,
            ),
            sistOppdatert: Date.now(),
          }
        }),

      nullstill: () => set({ ...startData(), sistOppdatert: Date.now() }),
    }),
    {
      name: STORAGE_NOKKEL,
      version: 2,
      partialize: (s) => ({
        turneringer: s.turneringer,
        deltakere: s.deltakere,
        kamper: s.kamper,
        sistOppdatert: s.sistOppdatert,
      }),
    },
  ),
)

// Live-oppdatering mellom faner: når en annen fane lagrer, leser vi inn på nytt.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_NOKKEL) void useStore.persist.rehydrate()
  })
}
