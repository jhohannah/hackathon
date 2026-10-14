import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Ikon } from '../components/Ikoner'
import { DELTAKERTYPE_NAVN, TYPE_NAVN } from '../core/format'
import { profilFor } from '../core/profiler'
import { lagGrenser, type PameldingFeil } from '../core/regler/pamelding'
import type { Deltakertype } from '../core/types'
import { useAuth } from '../lib/auth'
import { datoTekst } from '../lib/tid'
import { useStore } from '../store'
import { tr } from '../lib/i18n'

export function Pamelding() {
  const { id } = useParams()
  const navigate = useNavigate()
  const turneringer = useStore((s) => s.turneringer)
  const deltakere = useStore((s) => s.deltakere)
  const meldPa = useStore((s) => s.meldPa)
  const bruker = useAuth((a) => a.bruker)
  const deltakerBruker = bruker?.rolle === 'DELTAKER' ? bruker : undefined

  const apne = turneringer.filter((t) => t.status === 'PAMELDING_APEN')
  const [valgtId, setValgtId] = useState<string | undefined>(id ?? apne[0]?.id)
  useEffect(() => {
    if (id) setValgtId(id)
  }, [id])
  const t = turneringer.find((x) => x.id === valgtId)
  const profil = t ? profilFor(t) : undefined

  const [type, setType] = useState<Deltakertype>('LAG')
  const [navn, setNavn] = useState('')
  const [rating, setRating] = useState('')
  const [kaptein, setKaptein] = useState('')
  const [spillere, setSpillere] = useState<string[]>([''])
  const [epost, setEpost] = useState('')
  const [feil, setFeil] = useState<PameldingFeil>({})
  const [ok, setOk] = useState<string | undefined>()

  // Forhåndsvelg riktig type når turneringen byttes.
  useEffect(() => {
    if (t) setType(t.deltakertype)
    // Deltakere får navn og e-post fra innloggingen.
    if (t && deltakerBruker) {
      if (t.deltakertype === 'SPILLER') setNavn(deltakerBruker.navn)
      else setKaptein(deltakerBruker.navn)
      setEpost(deltakerBruker.epost ?? '')
    }
    setFeil({})
    setOk(undefined)
  }, [t?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const paameldt = t ? deltakere.filter((d) => d.turneringId === t.id) : []
  const grenser = t && profil ? lagGrenser(t, profil) : { min: 1, max: 1 }

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!t) return
    const res = meldPa(t.id, {
      type,
      navn,
      rating: rating === '' ? undefined : Number(rating),
      kaptein,
      spillere,
      epost,
    })
    if (!res.ok) {
      setFeil(res.feil)
      setOk(undefined)
      return
    }
    setFeil({})
    setOk(tr('{0} er meldt på {1}!', navn.trim(), t.navn))
    setNavn(t.deltakertype === 'SPILLER' && deltakerBruker ? deltakerBruker.navn : '')
    setRating('')
    setKaptein(t.deltakertype === 'LAG' && deltakerBruker ? deltakerBruker.navn : '')
    setSpillere([''])
    setEpost(deltakerBruker?.epost ?? '')
  }

  const typeAlternativ = (tp: Deltakertype) => {
    if (!t || !profil) return { aktiv: false, grunn: '' }
    if (!profil.tillatteDeltakertyper.includes(tp)) {
      return { aktiv: false, grunn: tr('{0} kan ikke spilles {1}.', tr(profil.navn), tp === 'LAG' ? tr('som lag') : tr('1 mot 1')) }
    }
    if (t.deltakertype !== tp) {
      return { aktiv: false, grunn: tr('Denne turneringen er kun for {0}.', t.deltakertype === 'LAG' ? tr('lag') : tr('1 mot 1')) }
    }
    return { aktiv: true, grunn: '' }
  }

  return (
    <div className="stabel" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1>{tr('Påmelding')}</h1>

      <div className="kort">
        <label className="felt">
          <span className="etikett">{tr('Turnering')}</span>
          <select
            value={valgtId ?? ''}
            onChange={(e) => {
              setValgtId(e.target.value)
              navigate(`/pamelding/${e.target.value}`, { replace: true })
            }}
          >
            {turneringer.map((x) => (
              <option key={x.id} value={x.id}>
                {x.navn}
                {x.status !== 'PAMELDING_APEN' ? ` (${tr('stengt')})` : ''}
              </option>
            ))}
          </select>
        </label>
        {t && profil && (
          <div className="rad" style={{ gap: 8 }}>
            <div className="ikon-boks" style={{ width: 36, height: 36 }}>
              <Ikon id={profil.ikon} />
            </div>
            <div className="liten">
              {tr(profil.navn)} · {TYPE_NAVN[t.type]} · {DELTAKERTYPE_NAVN[t.deltakertype]} · start {datoTekst(t.startdato)} ·{' '}
              {paameldt.length}/{t.maksDeltakere} {tr('påmeldt')}
            </div>
          </div>
        )}
      </div>

      {t && profil && (
        <form className="kort" onSubmit={send} noValidate>
          {t.status !== 'PAMELDING_APEN' && (
            <div className="feilboks">{tr('Påmeldingen er ikke åpen for denne turneringen.')}</div>
          )}
          {feil.generelt && <div className="feilboks" role="alert">{feil.generelt}</div>}
          {ok && <div className="suksess" role="status">{ok}</div>}

          <div className="felt">
            <span className="etikett" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              {tr('Jeg melder på')}
            </span>
            <div className="rutenett2">
              {(['LAG', 'SPILLER'] as Deltakertype[]).map((tp) => {
                const alt = typeAlternativ(tp)
                return (
                  <button
                    type="button"
                    key={tp}
                    className={`valgkort ${type === tp ? 'valgt' : ''}`}
                    disabled={!alt.aktiv}
                    onClick={() => setType(tp)}
                  >
                    <div>
                      <div className="tittel">{DELTAKERTYPE_NAVN[tp]}</div>
                      <div className="liten">{alt.aktiv ? (tp === 'LAG' ? 'Lag med kaptein og spillere' : 'Én spiller') : alt.grunn}</div>
                    </div>
                  </button>
                )
              })}
            </div>
            {feil.type && <div className="feil">{feil.type}</div>}
          </div>

          <label className="felt">
            <span className="etikett">{type === 'LAG' ? 'Lagnavn' : 'Navn / gamertag'}</span>
            <input type="text" value={navn} onChange={(e) => setNavn(e.target.value)} autoComplete="off" />
            {feil.navn && <div className="feil">{feil.navn}</div>}
          </label>

          {type === 'LAG' ? (
            <>
              <label className="felt">
                <span className="etikett">{tr('Lagkaptein')}</span>
                <input type="text" value={kaptein} onChange={(e) => setKaptein(e.target.value)} autoComplete="off" />
                {feil.kaptein && <div className="feil">{feil.kaptein}</div>}
              </label>
              <div className="felt">
                <span className="etikett" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  {tr('Spillere')} ({grenser.min}–{grenser.max} {tr('inkl. kaptein')})
                </span>
                {spillere.map((s, i) => (
                  <div className="rad" key={i} style={{ marginBottom: 8, flexWrap: 'nowrap' }}>
                    <input
                      type="text"
                      value={s}
                      placeholder={`${tr('Spiller')} ${i + 2}`}
                      onChange={(e) => setSpillere(spillere.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                    {spillere.length > 1 && (
                      <button type="button" className="knapp sek-knapp liten-knapp" onClick={() => setSpillere(spillere.filter((_, j) => j !== i))}>
                        {tr('Fjern')}
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="knapp sek-knapp liten-knapp"
                  disabled={spillere.length + 1 >= grenser.max}
                  onClick={() => setSpillere([...spillere, ''])}
                >
                  + Legg til spiller
                </button>
                {feil.spillere && <div className="feil">{feil.spillere}</div>}
              </div>
            </>
          ) : (
            <label className="felt">
              <span className="etikett">{tr('Rating (valgfritt)')}</span>
              <input type="number" inputMode="numeric" value={rating} onChange={(e) => setRating(e.target.value)} placeholder={tr('F.eks. 1650')} />
              {feil.rating && <div className="feil">{feil.rating}</div>}
            </label>
          )}

          <label className="felt">
            <span className="etikett">{tr('E-post (valgfritt)')}</span>
            <input type="text" value={epost} onChange={(e) => setEpost(e.target.value)} />
          </label>

          <button className="knapp" type="submit" style={{ width: '100%' }} disabled={t.status !== 'PAMELDING_APEN'}>
            {tr('Meld på')}
          </button>
        </form>
      )}

      {t && paameldt.length > 0 && (
        <div className="kort">
          <h3 style={{ marginBottom: 6 }}>Påmeldt ({paameldt.length})</h3>
          {paameldt.map((d) => (
            <div className="liste-rad" key={d.id}>
              <span>{d.visningsnavn}</span>
              <span className="liten">
                {d.type === 'LAG' ? `${(d.spillere?.length ?? 0) + 1} ${tr('spillere')}` : d.rating ? `${tr('Rating')} ${d.rating}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
