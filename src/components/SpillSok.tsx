import { useEffect, useId, useRef, useState } from 'react'
import { sokSpill, type SpillOppforing } from '../core/spillkatalog'
import { mailtoForesporsel, useForesporsler } from '../lib/foresporsel'
import { tr } from '../lib/i18n'

interface Props {
  /** Navnet på valgt spill (vises som en lukket «chip» med mulighet til å bytte). */
  valgt?: string
  onVelg: (o: SpillOppforing) => void
  onFjern?: () => void
  /** Gir en grunn hvis spillet ikke kan velges akkurat nå (f.eks. feil deltakertype). */
  utilgjengelig?: (o: SpillOppforing) => string | undefined
  /** Liten tilleggstekst bak hvert forslag, f.eks. antall turneringer. */
  merknad?: (o: SpillOppforing) => string | undefined
  plassholder?: string
  /** Skjul «send forespørsel» (for eksempel i filter på forsiden). */
  utenForesporsel?: boolean
}

/** Søkefelt for spill: forslag dukker opp mens man skriver, uavhengig av store/små bokstaver, mest populære først. */
export function SpillSok({ valgt, onVelg, onFjern, utilgjengelig, merknad, plassholder, utenForesporsel }: Props) {
  const [sok, setSok] = useState('')
  const [apen, setApen] = useState(false)
  const [aktiv, setAktiv] = useState(0)
  const [visSkjema, setVisSkjema] = useState(false)
  const rot = useRef<HTMLDivElement>(null)
  const listeId = useId()
  const treff = sokSpill(sok, 8)

  // Lukk listen når man klikker utenfor.
  useEffect(() => {
    const lukk = (e: MouseEvent) => {
      if (rot.current && !rot.current.contains(e.target as Node)) setApen(false)
    }
    document.addEventListener('mousedown', lukk)
    return () => document.removeEventListener('mousedown', lukk)
  }, [])
  useEffect(() => setAktiv(0), [sok])

  const velg = (o: SpillOppforing) => {
    if (utilgjengelig?.(o)) return
    onVelg(o)
    setSok('')
    setApen(false)
    setVisSkjema(false)
  }

  if (valgt && !apen && !sok) {
    return (
      <div className="spill-valgt">
        <span className="chip valgt">{valgt}</span>
        <button type="button" className="svak-lenke" onClick={() => { onFjern?.(); setApen(true) }}>
          {tr('Bytt spill')}
        </button>
      </div>
    )
  }

  return (
    <div className="spill-sok" ref={rot}>
      <input
        type="text"
        role="combobox"
        aria-expanded={apen}
        aria-controls={listeId}
        aria-autocomplete="list"
        autoComplete="off"
        value={sok}
        placeholder={plassholder ?? tr('Søk etter spill, f.eks. fotball, sjakk, padel …')}
        onFocus={() => setApen(true)}
        onChange={(e) => {
          setSok(e.target.value)
          setApen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setApen(true)
            setAktiv((a) => Math.min(a + 1, treff.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setAktiv((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && apen && treff[aktiv]) {
            e.preventDefault()
            velg(treff[aktiv])
          } else if (e.key === 'Escape') {
            setApen(false)
          }
        }}
      />
      {apen && (
        <ul className="spill-liste" id={listeId} role="listbox">
          {!sok.trim() && <li className="spill-hint" aria-hidden>{tr('Mest populære')}</li>}
          {treff.map((o, i) => {
            const grunn = utilgjengelig?.(o)
            const notat = merknad?.(o)
            return (
              <li
                key={o.navn}
                role="option"
                aria-selected={i === aktiv}
                aria-disabled={!!grunn}
                className={`spill-rad ${i === aktiv ? 'aktiv' : ''} ${grunn ? 'av' : ''}`}
                onMouseEnter={() => setAktiv(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  velg(o)
                }}
              >
                <span className="spill-navn">{tr(o.navn)}</span>
                <span className="liten">{grunn ?? notat ?? ''}</span>
              </li>
            )
          })}
          {treff.length === 0 && <li className="spill-hint">{tr('Ingen treff på «{0}».', sok.trim())}</li>}
          {!utenForesporsel && (
            <li className="spill-foresporsel">
              <button
                type="button"
                className="svak-lenke"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setVisSkjema(true)
                  setApen(false)
                }}
              >
                {tr('Finner du ikke spillet? Send forespørsel')}
              </button>
            </li>
          )}
        </ul>
      )}
      {visSkjema && <ForesporselSkjema forslag={sok} onLukk={() => setVisSkjema(false)} />}
    </div>
  )
}

function ForesporselSkjema({ forslag, onLukk }: { forslag: string; onLukk: () => void }) {
  const leggTil = useForesporsler((s) => s.leggTil)
  const [navn, setNavn] = useState(forslag)
  const [melding, setMelding] = useState('')
  const [sendt, setSendt] = useState(false)

  if (sendt) {
    return (
      <div className="suksess" role="status" style={{ marginTop: 8 }}>
        {tr('Takk! Vi har notert «{0}». Appen er under utvikling, så vi legger til flere spill fortløpende.', navn.trim())}
        <div>
          <button type="button" className="svak-lenke" onClick={onLukk}>{tr('Lukk')}</button>
        </div>
      </div>
    )
  }
  return (
    <div className="kort foresporsel" style={{ marginTop: 8, background: 'var(--kort2)' }}>
      <div className="liten" style={{ marginBottom: 6 }}>
        {tr('Appen er under utvikling. Mangler idretten eller spillet du leter etter? Send oss en forespørsel, så legger vi det til.')}
      </div>
      <label className="felt" style={{ marginBottom: 6 }}>
        <span className="etikett">{tr('Navn på idrett eller spill')}</span>
        <input type="text" value={navn} maxLength={60} onChange={(e) => setNavn(e.target.value)} />
      </label>
      <label className="felt" style={{ marginBottom: 8 }}>
        <span className="etikett">{tr('Kommentar (valgfritt)')}</span>
        <input type="text" value={melding} maxLength={200} onChange={(e) => setMelding(e.target.value)} />
      </label>
      <div className="rad">
        <a
          className={`knapp liten-knapp ${navn.trim().length < 2 ? 'av' : ''}`}
          href={navn.trim().length < 2 ? undefined : mailtoForesporsel(navn, melding)}
          aria-disabled={navn.trim().length < 2}
          onClick={() => {
            if (navn.trim().length < 2) return
            leggTil(navn)
            setSendt(true)
          }}
        >
          {tr('Send forespørsel')}
        </a>
        <button type="button" className="knapp sek-knapp liten-knapp" onClick={onLukk}>
          {tr('Avbryt')}
        </button>
      </div>
    </div>
  )
}
