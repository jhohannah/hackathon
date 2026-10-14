import { useUi } from '../lib/ui'
import { tr } from '../lib/i18n'

function Sol() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7L7 17M17 7l1.7-1.7" />
    </svg>
  )
}

function Maane() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  )
}

/** Glider for lys/mørk modus (sol til venstre, måne til høyre). */
export function TemaBryter() {
  const tema = useUi((u) => u.tema)
  const settTema = useUi((u) => u.settTema)
  const mork = tema === 'mork'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={mork}
      aria-label={tr('Mørk modus')}
      title={mork ? tr('Bytt til lys modus') : tr('Bytt til mørk modus')}
      className={`tema-bryter ${mork ? 'mork' : ''}`}
      onClick={() => settTema(mork ? 'lys' : 'mork')}
    >
      <span className="tema-ikon sol">
        <Sol />
      </span>
      <span className="tema-ikon maane">
        <Maane />
      </span>
      <span className="tema-knott">{mork ? <Maane /> : <Sol />}</span>
    </button>
  )
}
