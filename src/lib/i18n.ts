import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EN } from './en'

export type Sprak = 'no' | 'en'

interface SprakState {
  sprak: Sprak
  settSprak: (s: Sprak) => void
}

const forvalg = (): Sprak => 'no'

export const useSprak = create<SprakState>()(
  persist(
    (set) => ({
      sprak: forvalg(),
      settSprak: (sprak) => set({ sprak }),
    }),
    { name: 'nome-games-sprak' },
  ),
)

export const sprak = (): Sprak => useSprak.getState().sprak

/** Norsk er originalspråket. `tr('norsk tekst')` gir engelsk tekst når engelsk er valgt. {0}, {1} byttes ut med verdier. */
export function tr(no: string, ...verdier: (string | number)[]): string {
  const tekst = sprak() === 'en' ? (EN[no] ?? no) : no
  return verdier.length ? tekst.replace(/\{(\d+)\}/g, (_, i) => String(verdier[Number(i)] ?? '')) : tekst
}

/** Gjør et oppslagsobjekt (f.eks. TYPE_NAVN) språkbevisst uten å endre bruken. */
export function oversatt<T extends Record<string, string>>(rec: T): T {
  return new Proxy(rec, {
    get: (t, k) => (typeof k === 'string' && typeof t[k] === 'string' ? tr(t[k]) : Reflect.get(t, k)),
  })
}

export const locale = () => (sprak() === 'en' ? 'en-GB' : 'nb-NO')
