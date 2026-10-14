import { Ikon, Trofe } from './Ikoner'
import type { TurneringData } from '../lib/hooks'

export function VinnerBanner({ data }: { data: TurneringData }) {
  const { pallen, navn, profil, turnering } = data
  if (turnering.status !== 'AVSLUTTET' || !pallen.vinner) return null
  const tredje = pallen.tredje ?? []
  const grense = turnering.sveitsisk?.modus === 'GRENSE'

  return (
    <div className="vinner-banner">
      <Trofe className="troféi" />
      <div>
        <div className="etikett">{grense ? 'Beste rekord' : 'Vinner'}</div>
        <h2>{navn(pallen.vinner)}</h2>
        <div className="rad" style={{ gap: 6, color: '#d8d0ff', fontSize: '0.9rem' }}>
          <Ikon id={profil.ikon} className="" />
          <span>{turnering.navn}</span>
        </div>
        {grense && pallen.videre && (
          <div style={{ marginTop: 8, color: '#d8d0ff' }}>
            Videre: {pallen.videre.map((id) => navn(id)).join(', ')}
          </div>
        )}
      </div>
      {!grense && (
        <div className="pall" aria-label="Pallen">
          {pallen.andre && (
            <div className="pall-s n2">
              <div className="nr">2</div>
              {navn(pallen.andre)}
            </div>
          )}
          <div className="pall-s n1">
            <div className="nr">1</div>
            {navn(pallen.vinner)}
          </div>
          {tredje.length > 0 && (
            <div className="pall-s">
              <div className="nr">3</div>
              {tredje.map((id) => navn(id)).join(' / ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
