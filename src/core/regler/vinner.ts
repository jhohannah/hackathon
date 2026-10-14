import type { Kamp, Pallen, Tabellrad, Turnering } from '../types'
import { sveitsiskInnstillinger } from './sveitsisk'

/** Kårer vinner (og 2./3. plass) ut fra turneringstype. */
export function kaarVinner(t: Turnering, kamper: Kamp[], tabell: Tabellrad[]): Pallen {
  if (kamper.length === 0) return {}

  if (t.type === 'CUP') {
    const maks = kamper.reduce((m, k) => Math.max(m, k.runde), 0)
    const finale = kamper.find((k) => k.runde === maks)
    if (!finale || finale.status !== 'FERDIG' || !finale.vinnerId) return {}
    const taper = finale.deltakerAId === finale.vinnerId ? finale.deltakerBId : finale.deltakerAId
    const semi = kamper
      .filter((k) => k.runde === maks - 1 && k.status === 'FERDIG' && !k.erBye)
      .map((k) => (k.vinnerId === k.deltakerAId ? k.deltakerBId : k.deltakerAId))
      .filter((x): x is string => !!x)
    return { vinner: finale.vinnerId, andre: taper, tredje: semi.length ? semi : undefined }
  }

  if (t.type === 'SVEITSISK' && t.sveitsisk?.modus === 'GRENSE') {
    const s = sveitsiskInnstillinger(t, tabell.length)
    const videre = tabell.filter((r) => r.seire >= s.seireForVidere).map((r) => r.deltakerId)
    return { vinner: videre[0], videre }
  }

  return {
    vinner: tabell[0]?.deltakerId,
    andre: tabell[1]?.deltakerId,
    tredje: tabell[2] ? [tabell[2].deltakerId] : undefined,
  }
}
