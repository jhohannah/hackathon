import { veiTilTittelen } from '../core/regler/vei'
import type { TurneringData } from '../lib/hooks'
import { locale, tr } from '../lib/i18n'

interface Flis {
  tall: string
  navn: string
  /** Tallverdi brukes til å skjule fliser som er 0 når cupen er ferdig. */
  verdi?: number
}

export function StatistikkPanel({ data }: { data: TurneringData }) {
  const { statistikk: s, profil, navn, kamper, deltakere, turnering, pallen } = data
  const storste = s.storsteSeier ? kamper.find((k) => k.id === s.storsteSeier!.kampId) : undefined
  const enhet = profil.malEnhet
  const enhetTxt = tr(enhet)
  const sjakk = profil.resultatformat === 'SJAKK'
  const erCup = turnering.type === 'CUP'
  const cupFerdig = erCup && turnering.status === 'AVSLUTTET'
  const desimal = (n: number) => n.toLocaleString(locale(), { maximumFractionDigits: 1 })

  const kort: Flis[] = [
    { tall: String(s.spilt), navn: tr('Kamper spilt'), verdi: s.spilt },
    { tall: String(s.gjenstaar), navn: tr('Kamper igjen'), verdi: s.gjenstaar },
    { tall: desimal(s.snittMal), navn: tr('{0} per kamp (snitt)', `${enhetTxt[0].toUpperCase()}${enhetTxt.slice(1)}`), verdi: s.snittMal },
    {
      tall: String(s.totaltMal === Math.floor(s.totaltMal) ? s.totaltMal : desimal(s.totaltMal)),
      navn: tr('{0} totalt', enhetTxt),
      verdi: s.totaltMal,
    },
    { tall: String(s.walkovers), navn: tr('Walkovers (w.o.)'), verdi: s.walkovers },
  ]
  if (erCup) {
    // I en cup kan ingen kamp ende uavgjort, så vi viser heller hvor mange som gikk til avgjørelse.
    kort.push({ tall: String(s.avgjortPaStraffer), navn: tr('Avgjort på straffer'), verdi: s.avgjortPaStraffer })
  } else if (profil.uavgjortTillatt) {
    kort.push({ tall: `${Math.round(s.uavgjortProsent)} %`, navn: tr('Uavgjort') })
  }
  if (sjakk) {
    const sum = s.sideA + s.sideB
    kort.push({ tall: sum ? `${Math.round((s.sideA / sum) * 100)} %` : '–', navn: tr('Poengandel hvit') })
  }
  if (s.storsteSeier && storste) {
    kort.push({
      tall: `${navn(storste.vinnerId)}`,
      navn: tr('Største seier ({0} {1})', s.storsteSeier.diff, enhetTxt),
    })
  }
  if (s.lengsteSeiersrekke && s.lengsteSeiersrekke.antall >= 2) {
    kort.push({
      tall: tr('{0} på rad', s.lengsteSeiersrekke.antall),
      navn: tr('Lengste seiersrekke – {0}', navn(s.lengsteSeiersrekke.deltakerId)),
    })
  }
  // Når cupen er ferdig er fliser med verdi 0 bare støy.
  const synlige = cupFerdig ? kort.filter((k) => k.verdi !== 0) : kort

  return (
    <div className="stabel">
      <div className="stat-rutenett">
        {synlige.map((k) => (
          <div className="stat" key={k.navn}>
            <div className="tall" style={k.tall.length > 8 ? { fontSize: '1.3rem' } : undefined}>
              {k.tall}
            </div>
            <div className="navn">{k.navn}</div>
          </div>
        ))}
      </div>

      {erCup ? <VeiTilTittelen data={data} ferdig={cupFerdig} vinnerId={pallen.vinner} /> : <Form data={data} />}
    </div>
  )
}

function VeiTilTittelen({ data, ferdig, vinnerId }: { data: TurneringData; ferdig: boolean; vinnerId?: string }) {
  const { kamper, deltakere, profil, navn } = data
  const veier = veiTilTittelen(kamper, deltakere, profil, vinnerId, ferdig)
  return (
    <div className="kort">
      <h3 style={{ marginBottom: 2 }}>{tr('Vei til tittelen')}</h3>
      <div className="liten" style={{ marginBottom: 8 }}>
        {ferdig ? tr('Vinnerens vei gjennom rundene.') : tr('Veien så langt for lagene som fortsatt er med.')} {tr('Resultatene vises fra deres side.')}
      </div>
      {veier.length === 0 && <div className="liten">{tr('Ingen kamper spilt ennå.')}</div>}
      {veier.map((v) => (
        <div className="vei-rad" key={v.deltakerId}>
          <span className="vei-navn">{navn(v.deltakerId)}</span>
          {v.steg.length === 0 ? (
            <span className="liten">{tr('Ingen kamper spilt ennå')}</span>
          ) : (
            <span className="vei-steg">
              {v.steg.map((x, i) => (
                <span key={x.runde} className="vei-del">
                  {i > 0 && <span className="vei-skille" aria-hidden>·</span>}
                  <span className="vei-runde">{x.runde_kort}</span> {x.tekst}
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/** Formtabell (S/U/T) for liga, alle mot alle og Swiss. Uendret. */
function Form({ data }: { data: TurneringData }) {
  const { statistikk: s, deltakere } = data
  return (
    <div className="kort ren">
      <div className="tabell-vrap">
        <table className="tabell">
          <thead>
            <tr>
              <th className="navn">{tr('Form (siste 5)')}</th>
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
  )
}
