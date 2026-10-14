import { avgjoringTekst, rundeNavn, sideTekst } from '../core/format'
import type { Kamp } from '../core/types'
import type { TurneringData } from '../lib/hooks'
import { datoTid } from '../lib/tid'
import { Trofe } from './Ikoner'

type Vis = (k: Kamp) => void

function MatchKort({ kamp, data, onVelg, finale }: { kamp: Kamp; data: TurneringData; onVelg: Vis; finale?: boolean }) {
  const { profil, navn, deltakere } = data
  const ferdig = kamp.status === 'FERDIG'
  const klikkbar = !!kamp.deltakerAId && !!kamp.deltakerBId && !kamp.erBye
  const Tag = klikkbar ? 'button' : 'div'
  const dekor = avgjoringTekst(kamp)
  const seedAv = (id?: string) => deltakere.find((d) => d.id === id)?.seed

  const rad = (id: string | undefined, score: number | undefined) => {
    const vant = ferdig && !!id && kamp.vinnerId === id
    const tapt = ferdig && !!kamp.vinnerId && !!id && kamp.vinnerId !== id
    const seed = seedAv(id)
    return (
      <div className={`b-lag ${vant ? 'vant' : ''} ${tapt ? 'tapt' : ''} ${!id ? 'tom' : ''}`}>
        <span className="b-navn">
          {seed !== undefined && <span className="seed">{seed}</span>}
          {id ? navn(id) : kamp.erBye ? 'Bye' : 'Venter …'}
        </span>
        <span className="b-score">{ferdig && !kamp.erBye ? sideTekst(score, profil) : ''}</span>
      </div>
    )
  }

  return (
    <Tag
      className={`b-kamp ${finale ? 'finale' : ''} ${kamp.erBye ? 'bye' : ''}`}
      {...(klikkbar ? { onClick: () => onVelg(kamp), type: 'button' as const } : {})}
    >
      {rad(kamp.deltakerAId, kamp.resultatA)}
      {!kamp.erBye && rad(kamp.deltakerBId, kamp.resultatB)}
      <div className="b-info">
        <span>{kamp.erBye ? 'Frirunde' : (dekor ?? (ferdig ? 'Ferdig' : datoTid(kamp.tidspunkt)))}</span>
        {kamp.status === 'PAGAR' && <span className="b-live">Pågår</span>}
        {klikkbar && kamp.status === 'PLANLAGT' && <span className="b-registrer">Registrer</span>}
      </div>
    </Tag>
  )
}

function Kolonne({
  runde,
  antallRunder,
  kamper,
  data,
  onVelg,
}: {
  runde: number
  antallRunder: number
  kamper: Kamp[]
  data: TurneringData
  onVelg: Vis
}) {
  return (
    <div className="vm-kol">
      <h4>{rundeNavn(runde, antallRunder)}</h4>
      <div className="vm-slots">
        {kamper.map((k, i) => (
          <div
            key={k.id}
            className={`slot ut ${runde > 1 ? 'inn' : ''} ${kamper.length > 1 && i % 2 === 0 ? 'oppe' : ''}`}
          >
            {kamper.length > 1 && i % 2 === 0 && <span className="v" />}
            <MatchKort kamp={k} data={data} onVelg={onVelg} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** VM-aktig brakett: to halvdeler som møtes i finalen i midten, med koblingslinjer. */
export function Brakett({ data, onVelg }: { data: TurneringData; onVelg: Vis }) {
  const { kamper, navn, pallen, turnering } = data
  const antallRunder = kamper.reduce((m, k) => Math.max(m, k.runde), 0)
  if (antallRunder === 0) return <div className="tom">Braketten er ikke generert ennå.</div>

  const finale = kamper.find((k) => k.runde === antallRunder)!
  const runderMedHalvdel = Array.from({ length: antallRunder - 1 }, (_, i) => i + 1)
  const halvdel = (r: number, side: 'v' | 'h') => {
    const alle = kamper.filter((k) => k.runde === r)
    const halv = alle.length / 2
    return side === 'v' ? alle.slice(0, halv) : alle.slice(halv)
  }
  const venstre = runderMedHalvdel
  const hoyre = [...runderMedHalvdel].reverse()
  const harHalvdeler = antallRunder > 1

  return (
    <div className="vm-ramme">
      <div className="vm" data-runder={antallRunder}>
        {harHalvdeler && (
          <div className="vm-halv venstre">
            {venstre.map((r) => (
              <Kolonne key={r} runde={r} antallRunder={antallRunder} kamper={halvdel(r, 'v')} data={data} onVelg={onVelg} />
            ))}
          </div>
        )}

        <div className="vm-kol vm-midt">
          <h4>{rundeNavn(antallRunder, antallRunder)}</h4>
          <div className="vm-slots">
            <div className="slot final-slot">
              <div className={`final-wrap ${harHalvdeler ? 'har-halvdeler' : ''}`}>
                <MatchKort kamp={finale} data={data} onVelg={onVelg} finale />
                {turnering.status === 'AVSLUTTET' && pallen.vinner ? (
                  <div className="mester">
                    <Trofe className="mester-trofe" />
                    <div className="mester-etikett">Mester</div>
                    <div className="mester-navn">{navn(pallen.vinner)}</div>
                  </div>
                ) : (
                  <div className="mester tom-mester">
                    <Trofe className="mester-trofe" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {harHalvdeler && (
          <div className="vm-halv hoyre">
            {hoyre.map((r) => (
              <Kolonne key={r} runde={r} antallRunder={antallRunder} kamper={halvdel(r, 'h')} data={data} onVelg={onVelg} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
