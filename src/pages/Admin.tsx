import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ikon } from '../components/Ikoner'
import { StatusMerke } from '../components/ui'
import { DELTAKERTYPE_NAVN, TYPE_BESKRIVELSE, TYPE_NAVN, tallTekst } from '../core/format'
import { kanVelgeDeltakertype } from '../core/kombinasjoner'
import { foreslaaNavn } from '../core/navn'
import { PROFILER, hentProfil } from '../core/profiler'
import type { Deltakertype, Poeng, Status, Turnering, Turneringstype } from '../core/types'
import { tilDatoInput } from '../lib/tid'
import { useStore } from '../store'

const TYPER: Turneringstype[] = ['CUP', 'LIGA', 'ALLE_MOT_ALLE', 'SVEITSISK']

export function Admin() {
  const navigate = useNavigate()
  const turneringer = useStore((s) => s.turneringer)
  const deltakere = useStore((s) => s.deltakere)
  const kamper = useStore((s) => s.kamper)
  const opprett = useStore((s) => s.opprettTurnering)
  const settStatus = useStore((s) => s.settStatus)
  const genererOppsett = useStore((s) => s.genererOppsett)
  const nesteRunde = useStore((s) => s.nesteRunde)
  const meldPa = useStore((s) => s.meldPa)
  const nullstill = useStore((s) => s.nullstill)
  const fjernDeltaker = useStore((s) => s.fjernDeltaker)
  const flyttDeltaker = useStore((s) => s.flyttDeltaker)

  const [spillId, setSpillId] = useState<string | undefined>()
  const [type, setType] = useState<Turneringstype | undefined>()
  const [dt, setDt] = useState<Deltakertype | undefined>()
  const profil = spillId ? hentProfil(spillId) : undefined

  const [navn, setNavn] = useState('')
  const [maks, setMaks] = useState('8')
  const [start, setStart] = useState(tilDatoInput(new Date().toISOString()))
  const [intervall, setIntervall] = useState('7')
  const [bestOf, setBestOf] = useState('3')
  const [lagStr, setLagStr] = useState('7')
  const [seeding, setSeeding] = useState<'RATING' | 'TILFELDIG' | 'MANUELL'>('RATING')
  const [forslag, setForslag] = useState<string[]>([])
  const [modus, setModus] = useState<'RUNDER' | 'GRENSE'>('GRENSE')
  const [antallRunder, setAntallRunder] = useState('5')
  const [videre, setVidere] = useState('3')
  const [ute, setUte] = useState('3')
  const [poeng, setPoeng] = useState<{ s: string; u: string; t: string } | undefined>()
  const [feil, setFeil] = useState<string | undefined>()
  const [valgtTurn, setValgtTurn] = useState<string | undefined>()
  const [melding, setMelding] = useState<string | undefined>()

  const standardPoeng: Poeng | undefined = profil?.poeng
  const poengVerdi = poeng ?? (standardPoeng ? { s: String(standardPoeng.seier), u: String(standardPoeng.uavgjort), t: String(standardPoeng.tap) } : { s: '', u: '', t: '' })

  const velgSpill = (id: string) => {
    setSpillId(id)
    const p = hentProfil(id)
    setPoeng(undefined)
    setDt(p.tillatteDeltakertyper.length === 1 ? p.tillatteDeltakertyper[0] : undefined)
    if (p.id === 'fotball') setLagStr('7')
    if (p.id === 'esport') setLagStr('5')
    setBestOf(p.id === 'esport' ? '3' : '1')
    setModus(p.id === 'sjakk' ? 'RUNDER' : 'GRENSE')
  }

  const opprettTurnering = () => {
    if (!profil || !type || !dt) return
    if (!navn.trim()) return setFeil('Gi turneringen et navn.')
    const m = Number(maks)
    if (!Number.isInteger(m) || m < 2 || m > 64) return setFeil('Maks deltakere må være mellom 2 og 64.')
    const bo = Number(bestOf)
    if (profil.resultatformat === 'KART' && (bo % 2 === 0 || bo < 1 || bo > 7)) {
      return setFeil('Best-of må være et oddetall (1, 3, 5 …) slik at uavgjort er umulig.')
    }
    const p = { seier: Number(poengVerdi.s), uavgjort: Number(poengVerdi.u), tap: Number(poengVerdi.t) }
    if (![p.seier, p.uavgjort, p.tap].every((x) => Number.isFinite(x) && x >= 0)) return setFeil('Poeng må være tall.')
    const avvik = p.seier !== profil.poeng.seier || p.uavgjort !== profil.poeng.uavgjort || p.tap !== profil.poeng.tap
    const ny: Omit<Turnering, 'id' | 'oppdatert' | 'status'> = {
      navn: navn.trim(),
      spillprofilId: profil.id,
      type,
      deltakertype: dt,
      maksDeltakere: m,
      startdato: new Date(`${start}T18:00:00`).toISOString(),
      rundeintervall: type === 'LIGA' ? Number(intervall) || 7 : undefined,
      minutterPerKamp: type === 'ALLE_MOT_ALLE' ? 45 : undefined,
      bestOf: profil.resultatformat === 'KART' ? bo : undefined,
      lagstorrelse: dt === 'LAG' ? Number(lagStr) || undefined : undefined,
      poengOverstyring: avvik ? p : undefined,
      seeding: type === 'CUP' ? seeding : undefined,
      sveitsisk:
        type === 'SVEITSISK'
          ? modus === 'RUNDER'
            ? { modus, antallRunder: Number(antallRunder) || undefined }
            : { modus, seireForVidere: Number(videre) || 3, tapForUte: Number(ute) || 3 }
          : undefined,
    }
    const id = opprett(ny)
    setFeil(undefined)
    setNavn('')
    setValgtTurn(id)
    setMelding(`«${ny.navn}» er opprettet. Meld på deltakere og generer oppsettet.`)
  }

  const valgt = turneringer.find((t) => t.id === valgtTurn)
  const valgtDeltakere = deltakere.filter((d) => d.turneringId === valgtTurn)
  const valgtKamper = kamper.filter((k) => k.turneringId === valgtTurn)

  /** Legger til demodeltakere så oppsett kan genereres raskt. */
  const fyllDemo = (t: Turnering, antall: number) => {
    const p = hentProfil(t.spillprofilId)
    const eksisterende = deltakere.filter((d) => d.turneringId === t.id).length
    const lagNavn = ['Nordlys', 'Fjellrev', 'Havørn', 'Polar', 'Skarven', 'Lynet', 'Storm', 'Viddas', 'Midnatt', 'Aurora', 'Taiga', 'Fenris', 'Draug', 'Saga', 'Bølgen', 'Isbjørn']
    const personNavn = ['Ola N.', 'Kari B.', 'Jonas E.', 'Ingrid S.', 'Henrik L.', 'Silje M.', 'Tobias B.', 'Marte H.', 'Anders D.', 'Nora V.', 'Emil S.', 'Sara L.', 'Lars B.', 'Hanne H.', 'Magnus A.', 'Ida R.']
    const g = p.lagstorrelse ?? { min: 1, max: 1 }
    const str = t.lagstorrelse ?? g.min
    for (let i = 0; i < antall; i++) {
      const n = eksisterende + i
      meldPa(t.id, {
        type: t.deltakertype,
        navn: t.deltakertype === 'LAG' ? `${lagNavn[n % lagNavn.length]} ${n >= lagNavn.length ? n : 'FK'}` : `${personNavn[n % personNavn.length]} ${n >= personNavn.length ? n : ''}`.trim(),
        rating: 1400 + ((n * 137) % 700),
        kaptein: 'Kaptein Demo',
        spillere: Array.from({ length: Math.max(0, str - 1) }, (_, j) => `Spiller ${j + 2}`),
      })
    }
  }

  const kjor = (r: { ok: boolean; feil?: string }) => setMelding(r.ok ? undefined : r.feil)

  return (
    <div className="stabel">
      <div className="rad mellomrom">
        <h1>Admin</h1>
        <button
          className="knapp fare"
          onClick={() => {
            if (window.confirm('Tilbakestille alle data til demo-oppsettet?')) {
              nullstill()
              setValgtTurn(undefined)
              setMelding('Demodata er tilbakestilt.')
            }
          }}
        >
          Tilbakestill demodata
        </button>
      </div>

      {melding && <div className="suksess">{melding}</div>}

      <div className="admin-rutenett">
        {/* ---------- Veiviser ---------- */}
        <div className="kort">
          <h2 style={{ marginBottom: 12 }}>Opprett turnering</h2>

          <div className="felt">
            <h3>
              <span className="steg-nr">1</span>Spill
            </h3>
            <div className="rutenett2" style={{ marginTop: 8 }}>
              {PROFILER.map((p) => (
                <button key={p.id} className={`valgkort ${spillId === p.id ? 'valgt' : ''}`} onClick={() => velgSpill(p.id)}>
                  <div className="ikon-boks" style={{ width: 38, height: 38 }}>
                    <Ikon id={p.ikon} />
                  </div>
                  <div>
                    <div className="tittel">{p.navn}</div>
                    <div className="liten">{p.tillatteDeltakertyper.map((x) => DELTAKERTYPE_NAVN[x]).join(' / ')}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="felt" style={{ opacity: profil ? 1 : 0.5 }}>
            <h3>
              <span className="steg-nr">2</span>Turneringstype
            </h3>
            <div className="rutenett2" style={{ marginTop: 8 }}>
              {TYPER.map((tp) => (
                <button key={tp} disabled={!profil} className={`valgkort ${type === tp ? 'valgt' : ''}`} onClick={() => setType(tp)}>
                  <div>
                    <div className="tittel">{TYPE_NAVN[tp]}</div>
                    <div className="liten">{TYPE_BESKRIVELSE[tp]}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="felt" style={{ opacity: type ? 1 : 0.5 }}>
            <h3>
              <span className="steg-nr">3</span>Deltakertype
            </h3>
            <div className="rutenett2" style={{ marginTop: 8 }}>
              {(['LAG', 'SPILLER'] as Deltakertype[]).map((tp) => {
                const k = profil ? kanVelgeDeltakertype(profil, tp) : { ok: false }
                return (
                  <button key={tp} disabled={!type || !k.ok} className={`valgkort ${dt === tp ? 'valgt' : ''}`} onClick={() => setDt(tp)}>
                    <div>
                      <div className="tittel">{DELTAKERTYPE_NAVN[tp]}</div>
                      <div className="liten">{k.ok ? (tp === 'LAG' ? 'Lag med flere spillere' : 'Enkeltspillere') : k.grunn}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {profil && type && dt && (
            <div>
              <h3>
                <span className="steg-nr">4</span>Innstillinger
              </h3>
              {feil && <div className="feilboks" style={{ marginTop: 8 }}>{feil}</div>}
              <label className="felt" style={{ marginTop: 10, marginBottom: 6 }}>
                <span className="etikett">Navn</span>
                <input type="text" value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="F.eks. Nome Høstcup" />
              </label>
              <button
                type="button"
                className="knapp sek-knapp liten-knapp"
                onClick={() =>
                  setForslag(foreslaaNavn({ profil, type, dato: new Date(`${start}T12:00:00`), antall: 5 }))
                }
              >
                {forslag.length ? 'Flere forslag' : 'Foreslå navn'}
              </button>
              {forslag.length > 0 && (
                <div className="forslag" aria-label="Navneforslag">
                  {forslag.map((f) => (
                    <button type="button" key={f} className={`chip ${navn === f ? 'valgt' : ''}`} onClick={() => setNavn(f)}>
                      {f}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ height: 8 }} />
              <div className="rutenett2">
                <label className="felt">
                  <span className="etikett">Maks deltakere</span>
                  <input type="number" value={maks} onChange={(e) => setMaks(e.target.value)} />
                </label>
                <label className="felt">
                  <span className="etikett">Startdato</span>
                  <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </label>
                {type === 'LIGA' && (
                  <label className="felt">
                    <span className="etikett">Dager mellom runder</span>
                    <input type="number" value={intervall} onChange={(e) => setIntervall(e.target.value)} />
                  </label>
                )}
                {profil.resultatformat === 'KART' && (
                  <label className="felt">
                    <span className="etikett">Best av (oddetall)</span>
                    <select value={bestOf} onChange={(e) => setBestOf(e.target.value)}>
                      <option value="1">1</option>
                      <option value="3">3</option>
                      <option value="5">5</option>
                    </select>
                  </label>
                )}
                {dt === 'LAG' && (
                  <label className="felt">
                    <span className="etikett">Lagstørrelse</span>
                    {profil.id === 'fotball' ? (
                      <select value={lagStr} onChange={(e) => setLagStr(e.target.value)}>
                        <option value="5">5-er</option>
                        <option value="7">7-er</option>
                        <option value="11">11-er</option>
                      </select>
                    ) : (
                      <input type="number" value={lagStr} onChange={(e) => setLagStr(e.target.value)} />
                    )}
                  </label>
                )}
                {type === 'CUP' && (
                  <label className="felt">
                    <span className="etikett">Seeding</span>
                    <select value={seeding} onChange={(e) => setSeeding(e.target.value as 'RATING' | 'TILFELDIG' | 'MANUELL')}>
                      <option value="RATING">Etter rating</option>
                      <option value="MANUELL">Manuelt (jeg velger rekkefølgen)</option>
                      <option value="TILFELDIG">Tilfeldig</option>
                    </select>
                  </label>
                )}
              </div>

              {type === 'SVEITSISK' && (
                <div className="kort" style={{ background: 'var(--kort2)', marginBottom: 14 }}>
                  <div className="valg-rad" style={{ marginBottom: 10 }}>
                    <button className={`chip ${modus === 'GRENSE' ? 'valgt' : ''}`} onClick={() => setModus('GRENSE')}>
                      Swiss stage (3 seire / 3 tap)
                    </button>
                    <button className={`chip ${modus === 'RUNDER' ? 'valgt' : ''}`} onClick={() => setModus('RUNDER')}>
                      Klassisk (faste runder)
                    </button>
                  </div>
                  {modus === 'RUNDER' ? (
                    <label className="felt">
                      <span className="etikett">Antall runder</span>
                      <input type="number" value={antallRunder} onChange={(e) => setAntallRunder(e.target.value)} />
                    </label>
                  ) : (
                    <div className="rutenett2">
                      <label className="felt">
                        <span className="etikett">Seire for å gå videre</span>
                        <input type="number" value={videre} onChange={(e) => setVidere(e.target.value)} />
                      </label>
                      <label className="felt">
                        <span className="etikett">Tap for å være ute</span>
                        <input type="number" value={ute} onChange={(e) => setUte(e.target.value)} />
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div className="felt">
                <span className="etikett" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Poengsystem
                </span>
                <div className="rutenett2">
                  {([['s', 'Seier'], ['u', 'Uavgjort'], ['t', 'Tap']] as const).map(([k, l]) => (
                    <label key={k} className="felt" style={{ marginBottom: 0 }}>
                      <span className="liten">{l}</span>
                      <input
                        type="number"
                        step="0.5"
                        value={poengVerdi[k]}
                        onChange={(e) => setPoeng({ ...poengVerdi, [k]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
                <div className="liten" style={{ marginTop: 4 }}>
                  Standard for {profil.navn}: {tallTekst(profil.poeng.seier)} / {tallTekst(profil.poeng.uavgjort)} / {tallTekst(profil.poeng.tap)}
                  {!profil.uavgjortTillatt && ' (uavgjort brukes ikke)'}
                </div>
              </div>

              <button className="knapp" style={{ width: '100%' }} onClick={opprettTurnering}>
                Opprett turnering
              </button>
            </div>
          )}
        </div>

        {/* ---------- Administrer ---------- */}
        <div className="stabel">
          <div className="kort">
            <h2 style={{ marginBottom: 8 }}>Administrer turnering</h2>
            <select value={valgtTurn ?? ''} onChange={(e) => setValgtTurn(e.target.value || undefined)}>
              <option value="">Velg turnering …</option>
              {turneringer.map((t) => (
                <option key={t.id} value={t.id}>{t.navn}</option>
              ))}
            </select>

            {valgt && (
              <div className="stabel" style={{ marginTop: 14 }}>
                <div className="rad mellomrom">
                  <div className="merker">
                    <StatusMerke status={valgt.status} />
                    <span className="merke lilla">{TYPE_NAVN[valgt.type]}</span>
                  </div>
                  <Link to={`/turnering/${valgt.id}`} className="knapp sek-knapp liten-knapp">Åpne</Link>
                </div>

                <label className="felt" style={{ marginBottom: 0 }}>
                  <span className="etikett">Status</span>
                  <select
                    value={valgt.status}
                    disabled={valgtKamper.length > 0}
                    onChange={(e) => settStatus(valgt.id, e.target.value as Status)}
                  >
                    <option value="KOMMER">Kommer</option>
                    <option value="PAMELDING_APEN">Påmelding åpen</option>
                    <option value="PAGAR">Pågår</option>
                    <option value="AVSLUTTET">Avsluttet</option>
                  </select>
                </label>

                <div className="rad">
                  <button
                    className="knapp"
                    disabled={valgtDeltakere.length < 2 || valgtKamper.length > 0}
                    onClick={() => {
                      kjor(genererOppsett(valgt.id))
                      navigate(`/turnering/${valgt.id}`)
                    }}
                  >
                    Generer kampoppsett
                  </button>
                  {valgt.type === 'SVEITSISK' && (
                    <button
                      className="knapp sek-knapp"
                      disabled={valgtKamper.length === 0 || valgtKamper.some((k) => k.status !== 'FERDIG')}
                      onClick={() => kjor(nesteRunde(valgt.id))}
                    >
                      Generer neste runde
                    </button>
                  )}
                </div>
                {valgtDeltakere.length < 2 && <div className="liten">Minst 2 deltakere trengs.</div>}

                {valgtKamper.length === 0 && (
                  <div className="rad">
                    <button className="knapp sek-knapp liten-knapp" onClick={() => fyllDemo(valgt, 4)}>+ 4 demodeltakere</button>
                    <button className="knapp sek-knapp liten-knapp" onClick={() => fyllDemo(valgt, 8)}>+ 8 demodeltakere</button>
                    <Link to={`/pamelding/${valgt.id}`} className="knapp sek-knapp liten-knapp">Påmelding</Link>
                  </div>
                )}

                <div>
                  <h3>Deltakere ({valgtDeltakere.length}/{valgt.maksDeltakere})</h3>
                  {valgtDeltakere.length === 0 && <div className="liten">Ingen påmeldt ennå.</div>}
                  {valgt.type === 'CUP' && valgtKamper.length === 0 && valgtDeltakere.length > 1 && (
                    <div className="liten" style={{ marginBottom: 6 }}>
                      Seeding: {valgt.seeding === 'MANUELL' ? 'manuell – bruk pilene (1 = best)' : valgt.seeding === 'TILFELDIG' ? 'tilfeldig' : 'etter rating'}.
                      De to beste seedene havner i hver sin halvdel og kan møtes i finalen.
                    </div>
                  )}
                  {(valgt.type === 'CUP' && valgt.seeding !== 'MANUELL' && valgt.seeding !== 'TILFELDIG'
                    ? [...valgtDeltakere].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                    : valgtDeltakere
                  ).map((d, i) => (
                    <div className="liste-rad" key={d.id}>
                      <span className="seed-rad">
                        {valgt.type === 'CUP' && valgt.seeding !== 'TILFELDIG' && valgtKamper.length === 0 && (
                          <span className="seed">{i + 1}</span>
                        )}
                        {d.visningsnavn}
                        {d.rating ? <span className="liten">({d.rating})</span> : null}
                      </span>
                      {valgtKamper.length === 0 && (
                        <span className="rad" style={{ gap: 6 }}>
                          {valgt.type === 'CUP' && valgt.seeding === 'MANUELL' && (
                            <>
                              <button className="knapp sek-knapp liten-knapp" aria-label="Flytt opp" disabled={i === 0} onClick={() => flyttDeltaker(d.id, -1)}>↑</button>
                              <button className="knapp sek-knapp liten-knapp" aria-label="Flytt ned" disabled={i === valgtDeltakere.length - 1} onClick={() => flyttDeltaker(d.id, 1)}>↓</button>
                            </>
                          )}
                          <button className="knapp fare liten-knapp" onClick={() => fjernDeltaker(d.id)}>Fjern</button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="kort">
            <h3 style={{ marginBottom: 6 }}>Alle turneringer</h3>
            {turneringer.map((t) => (
              <div className="liste-rad" key={t.id}>
                <button className="chip" onClick={() => setValgtTurn(t.id)} style={{ textAlign: 'left' }}>{t.navn}</button>
                <StatusMerke status={t.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
