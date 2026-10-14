import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ikon } from '../components/Ikoner'
import { KampRad } from '../components/KampRad'
import { StatusMerke } from '../components/ui'
import { DELTAKERTYPE_NAVN, TYPE_NAVN } from '../core/format'
import { PROFILER, hentProfil } from '../core/profiler'
import { beregnTabell } from '../core/regler/tabell'
import { kaarVinner } from '../core/regler/vinner'
import type { Status, Turnering, Turneringstype } from '../core/types'
import { erIDag } from '../lib/tid'
import { useStore } from '../store'

const STATUSER: Status[] = ['PAMELDING_APEN', 'PAGAR', 'AVSLUTTET', 'KOMMER']
const STATUS_TEKST: Record<Status, string> = {
  PAMELDING_APEN: 'Påmelding åpen',
  PAGAR: 'Pågår',
  AVSLUTTET: 'Avsluttet',
  KOMMER: 'Kommer',
}

export function Oversikt() {
  const turneringer = useStore((s) => s.turneringer)
  const deltakere = useStore((s) => s.deltakere)
  const kamper = useStore((s) => s.kamper)
  const navigate = useNavigate()
  const [spill, setSpill] = useState<string | undefined>()
  const [type, setType] = useState<Turneringstype | undefined>()
  const [status, setStatus] = useState<Status | undefined>()
  const [visFerdige, setVisFerdige] = useState(false)

  const filtrert = turneringer.filter(
    (t) => (!spill || t.spillprofilId === spill) && (!type || t.type === type) && (!status || t.status === status),
  )
  const turnMap = useMemo(() => new Map(turneringer.map((t) => [t.id, t])), [turneringer])
  const deltakerNavn = useMemo(() => new Map(deltakere.map((d) => [d.id, d.visningsnavn])), [deltakere])
  const navn = (id?: string) => (id ? deltakerNavn.get(id) ?? '?' : 'Venter …')

  const idag = kamper
    .filter((k) => !k.erBye && erIDag(k.tidspunkt) && turnMap.get(k.turneringId)?.status !== 'KOMMER')
    .sort((a, b) => a.tidspunkt.localeCompare(b.tidspunkt))
  const idagSynlige = visFerdige ? idag : idag.filter((k) => k.status !== 'FERDIG')
  const antallFerdigeIdag = idag.length - idag.filter((k) => k.status !== 'FERDIG').length
  const pagar = kamper.filter((k) => k.status === 'PAGAR' && !k.erBye)

  const vinnerAv = (t: Turnering): string | undefined => {
    if (t.status !== 'AVSLUTTET') return undefined
    const profil = hentProfil(t.spillprofilId)
    const d = deltakere.filter((x) => x.turneringId === t.id)
    const k = kamper.filter((x) => x.turneringId === t.id)
    const v = kaarVinner(t, k, beregnTabell(k, d, profil, t)).vinner
    return v ? deltakerNavn.get(v) : undefined
  }

  const antallPaa = (t: Turnering) => deltakere.filter((d) => d.turneringId === t.id).length

  return (
    <>
      <div className="hero">
        <div>
          <h1>Turneringer</h1>
          <p>Cup, liga, alle mot alle og Swiss stage – i fotball, sjakk og e-sport.</p>
        </div>
        <Link to="/pamelding" className="knapp lys" style={{ display: 'inline-flex', alignItems: 'center' }}>
          Meld deg på
        </Link>
      </div>

      <div className="filter-rad">
        <div className="filter-gruppe">
          <span className="etikett">Spill</span>
          <button className={`chip ${!spill ? 'valgt' : ''}`} onClick={() => setSpill(undefined)}>Alle</button>
          {PROFILER.map((p) => (
            <button key={p.id} className={`chip ${spill === p.id ? 'valgt' : ''}`} onClick={() => setSpill(p.id)}>
              {p.navn}
            </button>
          ))}
        </div>
        <div className="filter-gruppe">
          <span className="etikett">Type</span>
          <button className={`chip ${!type ? 'valgt' : ''}`} onClick={() => setType(undefined)}>Alle</button>
          {(Object.keys(TYPE_NAVN) as Turneringstype[]).map((t) => (
            <button key={t} className={`chip ${type === t ? 'valgt' : ''}`} onClick={() => setType(t)}>
              {TYPE_NAVN[t]}
            </button>
          ))}
        </div>
        <div className="filter-gruppe">
          <span className="etikett">Status</span>
          <button className={`chip ${!status ? 'valgt' : ''}`} onClick={() => setStatus(undefined)}>Alle</button>
          {STATUSER.map((s) => (
            <button key={s} className={`chip ${status === s ? 'valgt' : ''}`} onClick={() => setStatus(s)}>
              {STATUS_TEKST[s]}
            </button>
          ))}
        </div>
      </div>

      {filtrert.length === 0 ? (
        <div className="kort tom">Ingen turneringer matcher filtrene.</div>
      ) : (
        <div className="rutenett">
          {filtrert.map((t) => {
            const profil = hentProfil(t.spillprofilId)
            const vinner = vinnerAv(t)
            return (
              <Link key={t.id} to={`/turnering/${t.id}`} className="kort turn-kort">
                <div className="turn-topp">
                  <div className="ikon-boks">
                    <Ikon id={profil.ikon} />
                  </div>
                  <div>
                    <div className="turn-tittel">{t.navn}</div>
                    <div className="liten">{profil.navn}</div>
                  </div>
                </div>
                <div className="merker">
                  <StatusMerke status={t.status} />
                  <span className="merke lilla">{TYPE_NAVN[t.type]}</span>
                  <span className="merke">{DELTAKERTYPE_NAVN[t.deltakertype]}</span>
                </div>
                <div className="liten" style={{ marginTop: 10 }}>
                  {antallPaa(t)} / {t.maksDeltakere} deltakere
                  {vinner && (
                    <>
                      {' · '}
                      <span className="merke gull">Vinner: {vinner}</span>
                    </>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {pagar.length > 0 && (
        <>
          <div className="seksjon-tittel">
            <h2>
              <span className="live-prikk" />
              Pågår nå
            </h2>
          </div>
          <div className="kort ren">
            {pagar.map((k) => {
              const t = turnMap.get(k.turneringId)!
              return (
                <KampRad
                  key={k.id}
                  kamp={k}
                  navn={navn}
                  profil={hentProfil(t.spillprofilId)}
                  turneringsnavn={t.navn}
                  onVelg={() => navigate(`/turnering/${t.id}`)}
                />
              )
            })}
          </div>
        </>
      )}

      <div className="seksjon-tittel">
        <h2>Dagens kamper</h2>
        <div className="rad">
          <span className="liten">{idagSynlige.length} kamper</span>
          {antallFerdigeIdag > 0 && (
            <button className="chip" onClick={() => setVisFerdige(!visFerdige)}>
              {visFerdige ? 'Skjul ferdige' : `Vis ferdige (${antallFerdigeIdag})`}
            </button>
          )}
        </div>
      </div>
      {idagSynlige.length === 0 ? (
        <div className="kort tom">Ingen kamper igjen i dag.</div>
      ) : (
        <div className="kort ren">
          {idagSynlige.map((k) => {
            const t = turnMap.get(k.turneringId)!
            return (
              <KampRad
                key={k.id}
                kamp={k}
                navn={navn}
                profil={hentProfil(t.spillprofilId)}
                turneringsnavn={t.navn}
                onVelg={() => navigate(`/turnering/${t.id}`)}
              />
            )
          })}
        </div>
      )}
    </>
  )
}
