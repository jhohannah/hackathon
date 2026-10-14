import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Brakett } from '../components/Brakett'
import { Ikon } from '../components/Ikoner'
import { Matrise } from '../components/Matrise'
import { ResultatSkjema } from '../components/ResultatSkjema'
import { Runder } from '../components/Runder'
import { RekordGrupper, RundeIndikator } from '../components/Sveitsisk'
import { StatistikkPanel } from '../components/StatistikkPanel'
import { Tabell } from '../components/Tabell'
import { Faner, StatusMerke } from '../components/ui'
import { VinnerBanner } from '../components/Vinner'
import { DELTAKERTYPE_NAVN, TYPE_NAVN } from '../core/format'
import { erFerdig } from '../core/regler/status'
import type { Kamp } from '../core/types'
import { useTurnering } from '../lib/hooks'
import { klokkeslett } from '../lib/tid'
import { useStore } from '../store'

type Fane = 'oversikt' | 'kamper' | 'tabell' | 'statistikk'

export function TurneringSide() {
  const { id } = useParams()
  const data = useTurnering(id)
  const sistOppdatert = useStore((s) => s.sistOppdatert)
  const genererOppsett = useStore((s) => s.genererOppsett)
  const nesteRunde = useStore((s) => s.nesteRunde)
  const [fane, setFane] = useState<Fane>('oversikt')
  const [valgtKamp, setValgtKamp] = useState<Kamp | undefined>()
  const [melding, setMelding] = useState<string | undefined>()

  if (!data) {
    return (
      <div className="kort tom">
        Fant ikke turneringen. <Link to="/">Til oversikten</Link>
      </div>
    )
  }
  const { turnering: t, profil, kamper, deltakere } = data
  const harOppsett = kamper.length > 0
  const swiss = t.type === 'SVEITSISK'
  const grense = swiss && t.sveitsisk?.modus === 'GRENSE'
  const alleFerdige = harOppsett && kamper.every((k) => k.status === 'FERDIG')
  const ferdig = erFerdig(t, kamper, deltakere, profil)
  const kanNeste = swiss && alleFerdige && !ferdig
  const uferdige = kamper.filter((k) => k.status !== 'FERDIG').length

  // Hold modalen i synk med nyeste data (f.eks. etter live-oppdatering).
  const aktivKamp = valgtKamp ? kamper.find((k) => k.id === valgtKamp.id) ?? valgtKamp : undefined

  const synligeFaner: { id: Fane; navn: string }[] =
    t.type === 'CUP'
      ? [{ id: 'oversikt', navn: 'Brakett' }, { id: 'kamper', navn: 'Kamper' }, { id: 'statistikk', navn: 'Statistikk' }]
      : t.type === 'LIGA'
        ? [{ id: 'oversikt', navn: 'Tabell og runder' }, { id: 'statistikk', navn: 'Statistikk' }]
        : t.type === 'ALLE_MOT_ALLE'
          ? [{ id: 'oversikt', navn: 'Tabell' }, { id: 'tabell', navn: 'Matrise' }, { id: 'kamper', navn: 'Kamper' }, { id: 'statistikk', navn: 'Statistikk' }]
          : grense
            ? [{ id: 'oversikt', navn: 'Rekord' }, { id: 'tabell', navn: 'Tabell' }, { id: 'kamper', navn: 'Kamper' }, { id: 'statistikk', navn: 'Statistikk' }]
            : [{ id: 'oversikt', navn: 'Tabell' }, { id: 'kamper', navn: 'Kamper' }, { id: 'statistikk', navn: 'Statistikk' }]

  const kjor = (fn: () => { ok: boolean; feil?: string }) => {
    const r = fn()
    setMelding(r.ok ? undefined : r.feil)
  }

  return (
    <div className="stabel">
      <div className="rad mellomrom">
        <div className="rad">
          <div className="ikon-boks">
            <Ikon id={profil.ikon} />
          </div>
          <div>
            <h1>{t.navn}</h1>
            <div className="merker" style={{ marginTop: 4 }}>
              <StatusMerke status={t.status} />
              <span className="merke lilla">{TYPE_NAVN[t.type]}</span>
              <span className="merke">{DELTAKERTYPE_NAVN[t.deltakertype]}</span>
              <span className="merke">{profil.navn}</span>
              {t.bestOf && <span className="merke">Best av {t.bestOf}</span>}
              {swiss && harOppsett && <RundeIndikator data={data} />}
            </div>
          </div>
        </div>
        <div className="liten" title="Oppdateres automatisk">
          <span className="live-prikk" style={{ background: 'var(--primar)' }} />
          Sist oppdatert {klokkeslett(new Date(sistOppdatert).toISOString())}
        </div>
      </div>

      <VinnerBanner data={data} />

      {melding && <div className="feilboks" role="alert">{melding}</div>}

      {!harOppsett && (
        <div className="kort">
          <div className="rad mellomrom">
            <div>
              <h3>Ingen kampoppsett ennå</h3>
              <div className="liten">
                {deltakere.length} påmeldt av {t.maksDeltakere}. {t.status === 'PAMELDING_APEN' ? 'Påmeldingen er åpen.' : ''}
              </div>
            </div>
            <div className="rad">
              {t.status === 'PAMELDING_APEN' && (
                <Link to={`/pamelding/${t.id}`} className="knapp sek-knapp">
                  Meld på
                </Link>
              )}
              <button className="knapp" disabled={deltakere.length < 2} onClick={() => kjor(() => genererOppsett(t.id))}>
                Generer kampoppsett
              </button>
            </div>
          </div>
        </div>
      )}

      {kanNeste && (
        <div className="kort">
          <div className="rad mellomrom">
            <div>
              <h3>Runden er ferdig</h3>
              <div className="liten">Neste runde parer deltakere med lik {grense ? 'rekord' : 'poengsum'}.</div>
            </div>
            <button className="knapp" onClick={() => kjor(() => nesteRunde(t.id))}>
              Generer neste runde
            </button>
          </div>
        </div>
      )}
      {swiss && harOppsett && !alleFerdige && !ferdig && (
        <div className="liten">
          {uferdige} kamp{uferdige === 1 ? '' : 'er'} gjenstår i runden før neste runde kan genereres.
        </div>
      )}

      {harOppsett && (
        <>
          <Faner faner={synligeFaner} valgt={fane} onVelg={setFane} />

          {fane === 'oversikt' && (
            <>
              {t.type === 'CUP' && <Brakett data={data} onVelg={setValgtKamp} />}
              {t.type === 'LIGA' && <Tabell data={data} />}
              {t.type === 'ALLE_MOT_ALLE' && <Tabell data={data} />}
              {swiss && !grense && <Tabell data={data} />}
              {grense && <RekordGrupper data={data} />}
            </>
          )}
          {fane === 'kamper' && <Runder data={data} onVelg={setValgtKamp} />}
          {fane === 'tabell' && (t.type === 'ALLE_MOT_ALLE' ? <Matrise data={data} /> : <Tabell data={data} />)}
          {fane === 'statistikk' && <StatistikkPanel data={data} />}
        </>
      )}

      {harOppsett && fane === 'oversikt' && t.type === 'LIGA' && (
        <>
          <h2 style={{ marginTop: 22 }}>Rundeoversikt</h2>
          <Runder data={data} onVelg={setValgtKamp} />
        </>
      )}

      {aktivKamp && <ResultatSkjema key={aktivKamp.id} kamp={aktivKamp} data={data} onLukk={() => setValgtKamp(undefined)} />}
    </div>
  )
}
