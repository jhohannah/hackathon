import { visResultat } from '../core/format'
import type { TurneringData } from '../lib/hooks'

/** Resultatmatrise: rad = deltaker, kolonne = motstander, sett fra radens side. */
export function Matrise({ data }: { data: TurneringData }) {
  const { deltakere, kamper, profil, tabell } = data
  const rekkefolge = tabell.map((r) => r.deltakerId)
  const navnAv = (id: string) => deltakere.find((d) => d.id === id)?.visningsnavn ?? '?'
  const forkort = (n: string) => (n.length > 10 ? `${n.slice(0, 9)}…` : n)

  const cellefor = (rad: string, kol: string) => {
    const k = kamper.find(
      (x) =>
        !x.erBye &&
        ((x.deltakerAId === rad && x.deltakerBId === kol) || (x.deltakerAId === kol && x.deltakerBId === rad)),
    )
    if (!k) return '·'
    if (k.status !== 'FERDIG') return '–'
    const raden = k.deltakerAId === rad
    const tekst = raden
      ? visResultat(k, profil)
      : visResultat({ ...k, resultatA: k.resultatB, resultatB: k.resultatA }, profil)
    const klasse = k.vinnerId === rad ? 's' : k.vinnerId ? 't' : ''
    return <span className={klasse}>{tekst}</span>
  }

  return (
    <div className="kort ren">
      <div className="tabell-vrap">
        <table className="tabell matrise">
          <thead>
            <tr>
              <th className="navn" />
              {rekkefolge.map((id) => (
                <th key={id} title={navnAv(id)}>
                  {forkort(navnAv(id))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rekkefolge.map((rad) => (
              <tr key={rad}>
                <td className="navn">{navnAv(rad)}</td>
                {rekkefolge.map((kol) =>
                  rad === kol ? (
                    <td key={kol} className="diag" />
                  ) : (
                    <td key={kol}>{cellefor(rad, kol)}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="liten" style={{ padding: '10px 14px', borderTop: '1px solid var(--kant)' }}>
        Resultat sett fra raden. – = ikke spilt ennå.
      </div>
    </div>
  )
}
