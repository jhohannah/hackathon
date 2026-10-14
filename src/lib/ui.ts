import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tema = 'lys' | 'mork'

interface Ui {
  dramatisk: boolean
  settDramatisk: (på: boolean) => void
  tema: Tema
  settTema: (tema: Tema) => void
}

const foretrukketTema = (): Tema =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'mork' : 'lys'

/** Visningsvalg (lagres i nettleseren, uavhengig av turneringsdata). */
export const useUi = create<Ui>()(
  persist(
    (set) => ({
      dramatisk: false,
      settDramatisk: (på) => set({ dramatisk: på }),
      tema: foretrukketTema(),
      settTema: (tema) => set({ tema }),
    }),
    { name: 'nome-games-ui' },
  ),
)
