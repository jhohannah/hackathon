import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth, type Rolle } from '../lib/auth'
import { tr } from '../lib/i18n'

/** Viser innholdet bare for riktig rolle. Ellers vises en forklaring og en lenke til innlogging. */
export function Krev({ roller, hva, children }: { roller: Rolle[]; hva: string; children: ReactNode }) {
  const bruker = useAuth((a) => a.bruker)
  const loggUt = useAuth((a) => a.loggUt)
  const { pathname } = useLocation()

  if (bruker && roller.includes(bruker.rolle)) return <>{children}</>

  const kunAdmin = roller.length === 1 && roller[0] === 'ADMIN'
  return (
    <div className="kort tom stabel" style={{ maxWidth: 520, margin: '24px auto', alignItems: 'center' }}>
      <h2>{kunAdmin ? tr('Bare for admin') : tr('Du må logge inn')}</h2>
      <div>
        {bruker
          ? tr('Du er logget inn som {0} (deltaker). Bare admin kan {1}.', bruker.navn, tr(hva))
          : kunAdmin
            ? tr('Logg inn som admin for å {0}.', tr(hva))
            : tr('Logg inn som deltaker eller admin for å {0}.', tr(hva))}
      </div>
      <div className="rad" style={{ justifyContent: 'center' }}>
        {bruker && (
          <button className="knapp sek-knapp" onClick={loggUt}>
            {tr('Logg ut')}
          </button>
        )}
        <Link to={`/logg-inn?til=${encodeURIComponent(pathname)}`} className="knapp">
          {bruker ? tr('Bytt bruker') : tr('Logg inn')}
        </Link>
      </div>
    </div>
  )
}
