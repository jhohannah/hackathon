import { useEffect, useMemo, useState } from 'react'
import type { Kamp } from '../core/types'
import type { TurneringData } from '../lib/hooks'
import { datoTekst } from '../lib/tid'
import { KampRad } from './KampRad'

/** Kampoppsett med én fane per runde. Åpner på første runde som ikke er ferdig. */
export function Runder({ data, onVelg }: { data: TurneringData; onVelg: (k: Kamp) => void }) {
  const { kamper, profil, navn } = data
  const runder = useMemo(
    () => [...new Set(kamper.map((k) => k.runde))].sort((a, b) => a - b),
    [kamper],
  )
  const aktivRunde = useMemo(() => {
    const uferdig = runder.find((r) => kamper.some((k) => k.runde === r && k.status !== 'FERDIG'))
    return uferdig ?? runder[runder.length - 1]
  }, [runder, kamper])
  const [valgt, setValgt] = useState<number | undefined>(undefined)
  useEffect(() => {
    setValgt(undefined)
  }, [data.turnering.id])
  const naa = valgt ?? aktivRunde

  if (runder.length === 0) return <div className="tom">Oppsettet er ikke generert ennå.</div>
  const iRunden = kamper.filter((k) => k.runde === naa)

  return (
    <div>
      <div className="runde-faner">
        {runder.map((r) => (
          <button key={r} className={`chip ${r === naa ? 'valgt' : ''}`} onClick={() => setValgt(r)}>
            Runde {r}
          </button>
        ))}
      </div>
      {iRunden[0] && data.turnering.type === 'LIGA' && (
        <div className="liten" style={{ marginBottom: 8 }}>
          {datoTekst(iRunden[0].tidspunkt)}
        </div>
      )}
      <div className="kort ren">
        {iRunden.map((k) => (
          <KampRad key={k.id} kamp={k} navn={navn} profil={profil} onVelg={onVelg} />
        ))}
      </div>
    </div>
  )
}
