import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ADMIN_PASSORD, trygSti, useAuth } from '../lib/auth'
import { tr } from '../lib/i18n'

export function LoggInn() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const til = params.get('til')
  const bruker = useAuth((a) => a.bruker)
  const loggInnAdmin = useAuth((a) => a.loggInnAdmin)
  const loggInnDeltaker = useAuth((a) => a.loggInnDeltaker)
  const loggUt = useAuth((a) => a.loggUt)

  const [passord, setPassord] = useState('')
  const [navn, setNavn] = useState('')
  const [epost, setEpost] = useState('')
  const [feilAdmin, setFeilAdmin] = useState<string | undefined>()
  const [feilDeltaker, setFeilDeltaker] = useState<string | undefined>()
  // Deltaker-innlogging er hovedvalget. Admin åpnes via en diskret lenke (eller når man kommer fra /admin).
  const [visAdmin, setVisAdmin] = useState(til?.startsWith('/admin') ?? false)

  const admin = (e: React.FormEvent) => {
    e.preventDefault()
    const r = loggInnAdmin(passord)
    if (!r.ok) return setFeilAdmin(r.feil)
    navigate(trygSti(til, '/admin'))
  }
  const deltaker = (e: React.FormEvent) => {
    e.preventDefault()
    const r = loggInnDeltaker(navn, epost)
    if (!r.ok) return setFeilDeltaker(r.feil)
    navigate(trygSti(til, '/pamelding'))
  }

  return (
    <div className="stabel" style={{ maxWidth: 440, margin: '0 auto' }}>
      <div className="rad mellomrom">
        <h1>{tr('Logg inn')}</h1>
        {bruker && (
          <div className="rad">
            <span className="liten">
              {tr('Innlogget som {0} ({1})', bruker.navn, bruker.rolle === 'ADMIN' ? tr('admin') : tr('deltaker'))}
            </span>
            <button className="knapp sek-knapp liten-knapp" onClick={loggUt}>
              {tr('Logg ut')}
            </button>
          </div>
        )}
      </div>

      <div className="stabel">
        <form className="kort" onSubmit={deltaker} noValidate>
          <h2 style={{ marginBottom: 4 }}>{tr('Deltaker')}</h2>
          <p className="liten" style={{ marginTop: 0 }}>
            {tr('Du kan melde deg på turneringer og følge med på resultater, men ikke opprette eller endre turneringer.')}
          </p>
          {feilDeltaker && <div className="feilboks" role="alert">{feilDeltaker}</div>}
          <label className="felt">
            <span className="etikett">{tr('Navn')}</span>
            <input type="text" value={navn} onChange={(e) => setNavn(e.target.value)} autoComplete="name" />
          </label>
          <label className="felt">
            <span className="etikett">{tr('E-post (valgfritt)')}</span>
            <input type="text" value={epost} onChange={(e) => setEpost(e.target.value)} autoComplete="email" />
          </label>
          <button className="knapp" type="submit" style={{ width: '100%' }}>
            {tr('Logg inn som deltaker')}
          </button>
        </form>

        {!visAdmin && (
          <button type="button" className="svak-lenke" onClick={() => setVisAdmin(true)}>
            {tr('Logg inn som admin')}
          </button>
        )}

        {visAdmin && (
        <form className="kort" onSubmit={admin} noValidate>
          <h2 style={{ marginBottom: 4 }}>{tr('Admin')}</h2>
          <p className="liten" style={{ marginTop: 0 }}>
            {tr('Admin kan opprette turneringer, generere kampoppsett og registrere eller endre resultater.')}
          </p>
          {feilAdmin && <div className="feilboks" role="alert">{feilAdmin}</div>}
          <label className="felt">
            <span className="etikett">{tr('Passord')}</span>
            <input type="password" value={passord} onChange={(e) => setPassord(e.target.value)} autoComplete="current-password" />
          </label>
          <button className="knapp" type="submit" style={{ width: '100%' }}>
            {tr('Logg inn som admin')}
          </button>
          <div className="liten" style={{ marginTop: 8 }}>
            {tr('Demo: passordet er «{0}». Innloggingen er bare en demo uten backend.', ADMIN_PASSORD)}
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
