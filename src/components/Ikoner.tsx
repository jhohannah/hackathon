import type { IkonId } from '../core/types'

const felles = {
  viewBox: '0 0 32 32',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Inline SVG-ikoner (ingen emoji). */
export function Ikon({ id, className }: { id: IkonId; className?: string }) {
  if (id === 'SJAKK') {
    // Sjakkbonde
    return (
      <svg {...felles} className={className} aria-hidden>
        <circle cx="16" cy="8.5" r="3.6" />
        <path d="M13 13.5h6M14 13.5c0 4-3 5-3 9h10c0-4-3-5-3-9" />
        <path d="M8.5 25h15v3h-15z" />
      </svg>
    )
  }
  if (id === 'FOTBALL') {
    return (
      <svg {...felles} className={className} aria-hidden>
        <circle cx="16" cy="16" r="12" />
        <path d="M16 10.5l4.8 3.5-1.8 5.6h-6l-1.8-5.6z" />
        <path d="M16 10.5V4.2M20.8 14l6-2M19 19.6l3.8 5M13 19.6l-3.8 5M11.2 14l-6-2" />
      </svg>
    )
  }
  // Spillkontroller
  return (
    <svg {...felles} className={className} aria-hidden>
      <path d="M9.5 9h13a5.5 5.5 0 0 1 5.4 4.5l1.3 7a3.3 3.3 0 0 1-5.7 2.6l-2.6-3H11.1l-2.6 3a3.3 3.3 0 0 1-5.7-2.6l1.3-7A5.5 5.5 0 0 1 9.5 9z" />
      <path d="M10 13v5M7.5 15.5h5" />
      <circle cx="20.5" cy="14.2" r="0.9" fill="currentColor" />
      <circle cx="23.3" cy="17" r="0.9" fill="currentColor" />
    </svg>
  )
}

export function Trofe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M14 6h20v12a10 10 0 0 1-20 0z" />
      <path d="M14 10H7c0 6 3 9 8 10M34 10h7c0 6-3 9-8 10" />
      <path d="M24 28v7M16 42h16M18 42v-4h12v4" />
    </svg>
  )
}
