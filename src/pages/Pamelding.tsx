import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Ikon } from '../components/Ikoner'
import { DELTAKERTYPE_NAVN, TYPE_NAVN } from '../core/format'
import { hentProfil } from '../core/profiler'
import { lagGrenser, type PameldingFeil } from '../core/regler/pamelding'
import type { Deltakertype } from '../core/types'
import { datoTekst } from '../lib/tid'
import { useStore } from '../store'

export function Pamelding() {
  const { id } = useParams()
  const navigate = useNavigate()
  const turneringer = useStore((s) => s.turneringer)
  const deltakere = useStore((s) => s.deltakere)
  const meldPa = useStore((s) => s.meldPa)

  const apne = turneringer.filter((t) => t.status === 'PAMELDING_APEN')
  const [valgtId, setValgtId] = useState<string | undefined>(id ?? apne[0]?.id)
  useEffect(() => {
    if (id) setValgtId(id)
  }, [id])
  const t = turneringer.find((x) => x.id === valgtId)
  const profil = t ? hentProfil(t.spillprofilId) : undefined

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
    setOk(`${navn.trim()} er meldt på ${t.navn}!`)
    setNavn('')
    setRating('')
    setKaptein('')
    setSpillere([''])
    setEpost('')
  }

  const typeAlternativ = (tp: Deltakertype) => {
    if (!t || !profil) return { aktiv: false, grunn: '' }
    if (!profil.tillatteDeltakertyper.includes(tp)) {
      return { aktiv: false, grunn: `${profil.navn} kan ikke spilles ${tp === 'LAG' ? 'som lag' : '1 mot 1'}.` }
    }
    if (t.deltakertype !== tp) {
      return { aktiv: false, grunn: `Denne turneringen er kun for ${t.deltakertype === 'LAG' ? 'lag' : '1 mot 1'}.` }
    }
    return { aktiv: true, grunn: '' }
  }

  return (
    <div className="stabel" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1>Påmelding</h1>

      <div className="kort">
        <label className="felt">
          <span className="etikett">Turnering</span>
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
                {x.status !== 'PAMELDING_APEN' ? ' (stengt)' : ''}
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
              {profil.navn} · {TYPE_NAVN[t.type]} · {DELTAKERTYPE_NAVN[t.deltakertype]} · start {datoTekst(t.startdato)} ·{' '}
              {paameldt.length}/{t.maksDeltakere} påmeldt
            </div>
          </div>
        )}
      </div>

      {t && profil && (
        <form className="kort" onSubmit={send} noValidate>
          {t.status !== 'PAMELDING_APEN' && (
            <div className="feilboks">Påmeldingen er ikke åpen for denne turneringen.</div>
          )}
          {feil.generelt && <div className="feilboks" role="alert">{feil.generelt}</div>}
          {ok && <div className="suksess" role="status">{ok}</div>}

          <div className="felt">
            <span className="etikett" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Jeg melder på
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
                <span className="etikett">Lagkaptein</span>
                <input type="text" value={kaptein} onChange={(e) => setKaptein(e.target.value)} autoComplete="off" />
                {feil.kaptein && <div className="feil">{feil.kaptein}</div>}
              </label>
              <div className="felt">
                <span className="etikett" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Spillere ({grenser.min}–{grenser.max} inkl. kaptein)
                </span>
                {spillere.map((s, i) => (
                  <div className="rad" key={i} style={{ marginBottom: 8, flexWrap: 'nowrap' }}>
                    <input
                      type="text"
                      value={s}
                      placeholder={`Spiller ${i + 2}`}
                      onChange={(e) => setSpillere(spillere.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                    {spillere.length > 1 && (
                      <button type="button" className="knapp sek-knapp liten-knapp" onClick={() => setSpillere(spillere.filter((_, j) => j !== i))}>
                        Fjern
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
              <span className="etikett">Rating (valgfritt)</span>
              <input type="number" inputMode="numeric" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="F.eks. 1650" />
              {feil.rating && <div className="feil">{feil.rating}</div>}
            </label>
          )}

          <label className="felt">
            <span className="etikett">E-post (valgfritt)</span>
            <input type="text" value={epost} onChange={(e) => setEpost(e.target.value)} />
          </label>

          <button className="knapp" type="submit" style={{ width: '100%' }} disabled={t.status !== 'PAMELDING_APEN'}>
            Meld på
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
                {d.type === 'LAG' ? `${(d.spillere?.length ?? 0) + 1} spillere` : d.rating ? `Rating ${d.rating}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
