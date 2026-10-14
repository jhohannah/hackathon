import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Ui {
  dramatisk: boolean
  settDramatisk: (på: boolean) => void
}

/** Visningsvalg (lagres i nettleseren, uavhengig av turneringsdata). */
export const useUi = create<Ui>()(
  persist(
    (set) => ({
      dramatisk: false,
      settDramatisk: (på) => set({ dramatisk: på }),
    }),
    { name: 'nome-games-ui' },
  ),
)
