import { useMemo } from 'react'
import { profilFor } from '../core/profiler'
import { beregnTabell } from '../core/regler/tabell'
import { kaarVinner } from '../core/regler/vinner'
import { beregnStatistikk } from '../core/regler/statistikk'
import { useStore } from '../store'

/** Alt en turneringsside trenger, utregnet fra rådata i storen. */
export function useTurnering(id: string | undefined) {
  const turneringer = useStore((s) => s.turneringer)
  const alleDeltakere = useStore((s) => s.deltakere)
  const alleKamper = useStore((s) => s.kamper)

  return useMemo(() => {
    const turnering = turneringer.find((t) => t.id === id)
    if (!turnering) return undefined
    const profil = profilFor(turnering)
    const deltakere = alleDeltakere.filter((d) => d.turneringId === turnering.id)
    const kamper = alleKamper.filter((k) => k.turneringId === turnering.id)
    const tabell = beregnTabell(kamper, deltakere, profil, turnering)
    const pallen = turnering.status === 'AVSLUTTET' ? kaarVinner(turnering, kamper, tabell) : {}
    const statistikk = beregnStatistikk(kamper, deltakere)
    const navnMap = new Map(deltakere.map((d) => [d.id, d.visningsnavn]))
    const navn = (did?: string) => (did ? navnMap.get(did) ?? '?' : 'Venter …')
    return { turnering, profil, deltakere, kamper, tabell, pallen, statistikk, navn }
  }, [id, turneringer, alleDeltakere, alleKamper])
}

export type TurneringData = NonNullable<ReturnType<typeof useTurnering>>
