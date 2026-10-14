import { locale, tr } from './i18n'

export function erIDag(iso: string, na: Date = new Date()): boolean {
  const d = new Date(iso)
  return (
    d.getFullYear() === na.getFullYear() &&
    d.getMonth() === na.getMonth() &&
    d.getDate() === na.getDate()
  )
}

export function klokkeslett(iso: string): string {
  return new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })
}

export function datoTekst(iso: string): string {
  return new Date(iso).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' })
}

export function datoTid(iso: string): string {
  return erIDag(iso) ? `${tr('I dag')} ${klokkeslett(iso)}` : `${datoTekst(iso)} ${klokkeslett(iso)}`
}

export function tilDatoInput(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
