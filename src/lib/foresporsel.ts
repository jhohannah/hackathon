import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Hit sendes forespørsler om nye spill. Bytt til riktig adresse før lansering. */
export const FORESPORSEL_EPOST = 'hei@nomegames.no'

interface Foresporsel {
  navn: string
  tid: number
}

interface State {
  sendte: Foresporsel[]
  leggTil: (navn: string) => void
}

/** Appen har ingen backend, så forespørslene lagres lokalt og sendes som e-post fra brukerens eget e-postprogram. */
export const useForesporsler = create<State>()(
  persist(
    (set) => ({
      sendte: [],
      leggTil: (navn) => set((s) => ({ sendte: [...s.sendte, { navn: navn.trim(), tid: Date.now() }] })),
    }),
    { name: 'nome-games-foresporsler' },
  ),
)

export function mailtoForesporsel(navn: string, melding: string): string {
  const emne = `Ny idrett/nytt spill: ${navn.trim()}`
  const tekst = `Hei!\n\nKan dere legge til «${navn.trim()}» i Nome Games?${melding.trim() ? `\n\n${melding.trim()}` : ''}\n`
  return `mailto:${FORESPORSEL_EPOST}?subject=${encodeURIComponent(emne)}&body=${encodeURIComponent(tekst)}`
}
