import { avgjoringTekst, rundeNavn, sideTekst } from '../core/format'
import type { Kamp } from '../core/types'
import type { TurneringData } from '../lib/hooks'

export function Brakett({ data, onVelg }: { data: TurneringData; onVelg: (k: Kamp) => void }) {
  const { kamper, profil, navn } = data
  const antallRunder = kamper.reduce((m, k) => Math.max(m, k.runde), 0)
  if (antallRunder === 0) return <div className="tom">Braketten er ikke generert ennå.</div>

  return (
    <div className="brakett">
      {Array.from({ length: antallRunder }, (_, i) => i + 1).map((r) => (
        <div className="brakett-kol" key={r}>
          <h4>{rundeNavn(r, antallRunder)}</h4>
          <div className="brakett-kamper">
            {kamper
              .filter((k) => k.runde === r)
              .map((k) => {
                const ferdig = k.status === 'FERDIG'
                const klikkbar = !!k.deltakerAId && !!k.deltakerBId && !k.erBye
                const Tag = klikkbar ? 'button' : 'div'
                const rad = (id: string | undefined, score: number | undefined) => {
                  const vant = ferdig && !!id && k.vinnerId === id
                  const tapt = ferdig && !!k.vinnerId && !!id && k.vinnerId !== id
                  return (
                    <div className={`b-lag ${vant ? 'vant' : ''} ${tapt ? 'tapt' : ''} ${!id ? 'tom' : ''}`}>
                      <span>{id ? navn(id) : k.erBye ? 'Bye' : 'Venter …'}</span>
                      <span>{ferdig && !k.erBye ? sideTekst(score, profil) : ''}</span>
                    </div>
                  )
                }
                const dekor = avgjoringTekst(k)
                return (
                  <Tag
                    key={k.id}
                    className="b-kamp"
                    {...(klikkbar ? { onClick: () => onVelg(k), type: 'button' as const } : {})}
                  >
                    {rad(k.deltakerAId, k.resultatA)}
                    {rad(k.deltakerBId, k.resultatB)}
                    {(dekor || k.status === 'PAGAR' || k.erBye) && (
                      <div className="b-info">
                        <span>{k.erBye ? 'Frirunde' : dekor}</span>
                        {k.status === 'PAGAR' && <span>Pågår</span>}
                      </div>
                    )}
                  </Tag>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}
