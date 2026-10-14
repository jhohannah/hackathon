import type { TurneringData } from '../lib/hooks'

export function StatistikkPanel({ data }: { data: TurneringData }) {
  const { statistikk: s, profil, navn, kamper, deltakere } = data
  const storste = s.storsteSeier ? kamper.find((k) => k.id === s.storsteSeier!.kampId) : undefined
  const enhet = profil.malEnhet
  const sjakk = profil.resultatformat === 'SJAKK'
  const desimal = (n: number) => n.toLocaleString('nb-NO', { maximumFractionDigits: 1 })

  const kort: { tall: string; navn: string }[] = [
    { tall: String(s.spilt), navn: 'Kamper spilt' },
    { tall: String(s.gjenstaar), navn: 'Kamper igjen' },
    { tall: desimal(s.snittMal), navn: `${enhet[0].toUpperCase()}${enhet.slice(1)} per kamp (snitt)` },
    { tall: String(s.totaltMal === Math.floor(s.totaltMal) ? s.totaltMal : desimal(s.totaltMal)), navn: `${enhet} totalt` },
    { tall: String(s.walkovers), navn: 'Walkovers (w.o.)' },
  ]
  if (profil.uavgjortTillatt) kort.push({ tall: `${Math.round(s.uavgjortProsent)} %`, navn: 'Uavgjort' })
  if (sjakk) {
    const sum = s.sideA + s.sideB
    kort.push({ tall: sum ? `${Math.round((s.sideA / sum) * 100)} %` : '–', navn: 'Poengandel hvit' })
  }
  if (s.storsteSeier && storste) {
    kort.push({
      tall: `${navn(storste.vinnerId)}`,
      navn: `Største seier (${s.storsteSeier.diff} ${enhet})`,
    })
  }
  if (s.lengsteSeiersrekke && s.lengsteSeiersrekke.antall >= 2) {
    kort.push({
      tall: `${s.lengsteSeiersrekke.antall} på rad`,
      navn: `Lengste seiersrekke – ${navn(s.lengsteSeiersrekke.deltakerId)}`,
    })
  }

  return (
    <div className="stabel">
      <div className="stat-rutenett">
        {kort.map((k) => (
          <div className="stat" key={k.navn}>
            <div className="tall" style={k.tall.length > 8 ? { fontSize: '1.3rem' } : undefined}>
              {k.tall}
            </div>
            <div className="navn">{k.navn}</div>
          </div>
        ))}
      </div>
      <div className="kort ren">
        <div className="tabell-vrap">
          <table className="tabell">
            <thead>
              <tr>
                <th className="navn">Form (siste 5)</th>
                <th>S / U / T</th>
              </tr>
            </thead>
            <tbody>
              {deltakere.map((d) => {
                const f = s.form[d.id] ?? []
                return (
                  <tr key={d.id}>
                    <td className="navn">{d.visningsnavn}</td>
                    <td>
                      {f.length === 0 ? (
                        <span className="liten">–</span>
                      ) : (
                        <span className="form-chips">
                          {f.map((x, i) => (
                            <span key={i} className={`fc ${x}`}>
                              {x}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
