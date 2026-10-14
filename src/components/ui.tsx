import type { ReactNode } from 'react'
import { STATUS_NAVN } from '../core/format'
import type { Status } from '../core/types'
import { tr } from '../lib/i18n'

export function StatusMerke({ status }: { status: Status }) {
  return <span className={`merke ${status}`}>{STATUS_NAVN[status]}</span>
}

export function Modal({ children, onClose, tittel }: { children: ReactNode; onClose: () => void; tittel: string }) {
  return (
    <div className="bakteppe" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr(tittel)}>
        <div className="rad mellomrom">
          <h2>{tr(tittel)}</h2>
          <button className="knapp sek-knapp liten-knapp" onClick={onClose}>
            {tr('Lukk')}
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Faner<T extends string>({
  faner,
  valgt,
  onVelg,
}: {
  faner: { id: T; navn: string }[]
  valgt: T
  onVelg: (id: T) => void
}) {
  return (
    <div className="faner" role="tablist">
      {faner.map((f) => (
        <button
          key={f.id}
          role="tab"
          aria-selected={valgt === f.id}
          className={`fane ${valgt === f.id ? 'aktiv' : ''}`}
          onClick={() => onVelg(f.id)}
        >
          {tr(f.navn)}
        </button>
      ))}
    </div>
  )
}
