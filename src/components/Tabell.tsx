import { KOLONNE_NAVN, KOLONNE_TITTEL, tallTekst } from '../core/format'
import { effektivPoeng, tabellkolonner } from '../core/regler/tabell'
import type { KolonneId, Tabellrad } from '../core/types'
import type { TurneringData } from '../lib/hooks'
import { tr } from '../lib/i18n'

function celle(kol: KolonneId, r: Tabellrad) {
  switch (kol) {
    case 'S':
      return r.spilt
    case 'V':
      return r.seire
    case 'U':
      return r.uavgjort
    case 'T':
      return r.tap
    case 'MAL':
      return `${tallTekst(r.malFor)}–${tallTekst(r.malMot)}`
    case 'DIFF':
      return r.diff > 0 ? `+${tallTekst(r.diff)}` : tallTekst(r.diff)
    case 'P':
      return tallTekst(r.poeng)
    case 'SB':
      return tallTekst(r.sb)
    case 'BH':
      return tallTekst(r.bh)
  }
}

export function Tabell({ data }: { data: TurneringData }) {
  const { turnering, profil, tabell } = data
  const kolonner = tabellkolonner(turnering, profil)
  // Chess har ingen uavgjort-kolonne i e-sport, så kolonnene styres av profilen.
  const p = effektivPoeng(turnering, profil)
  const spilt = tabell.some((r) => r.spilt > 0)

  return (
    <div className="kort ren">
      <div className="tabell-vrap">
        <table className="tabell">
          <thead>
            <tr>
              <th>#</th>
              <th className="navn">{turnering.deltakertype === 'LAG' ? 'Lag' : 'Spiller'}</th>
              {kolonner.map((k) => (
                <th key={k} title={KOLONNE_TITTEL[k]}>
                  {profil.resultatformat === 'SJAKK' && k === 'V' ? 'S' : KOLONNE_NAVN[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabell.map((r) => (
              <tr key={r.deltakerId} className={r.plass === 1 && spilt ? 'leder' : ''}>
                <td className="plass">{r.plass}</td>
                <td className="navn">{r.navn}</td>
                {kolonner.map((k) => (
                  <td
                    key={k}
                    className={`${k === 'P' ? 'p' : ''} ${k === 'DIFF' ? (r.diff > 0 ? 'pos' : r.diff < 0 ? 'neg' : '') : ''}`}
                  >
                    {celle(k, r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="liten" style={{ padding: '10px 14px', borderTop: '1px solid var(--kant)' }}>
        {tr('Poengsystem')}: {tr('Seier')} {tallTekst(p.seier)} · {tr('Uavgjort')} {tallTekst(p.uavgjort)} · {tr('Tap')} {tallTekst(p.tap)}
        {turnering.poengOverstyring && ' (tilpasset)'}
      </div>
    </div>
  )
}
