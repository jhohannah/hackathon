import type { Deltaker, Kamp, Statistikk } from '../types'

export function beregnStatistikk(kamper: Kamp[], deltakere: Deltaker[]): Statistikk {
  const ekte = kamper.filter((k) => !k.erBye)
  const ferdige = ekte
    .filter((k) => k.status === 'FERDIG')
    .sort((a, b) => a.tidspunkt.localeCompare(b.tidspunkt) || a.runde - b.runde)

  let totaltMal = 0
  let sideA = 0
  let sideB = 0
  let uavgjort = 0
  let walkovers = 0
  let straffer = 0
  let storste: Statistikk['storsteSeier']
  const form: Statistikk['form'] = {}
  const rekke: Record<string, number> = {}
  let lengste: Statistikk['lengsteSeiersrekke']
  for (const d of deltakere) form[d.id] = []

  for (const k of ferdige) {
    if (k.walkover) {
      walkovers++
      continue // walkover-score regnes ikke med i målstatistikk
    }
    const a = k.resultatA ?? 0
    const b = k.resultatB ?? 0
    totaltMal += a + b
    sideA += a
    sideB += b
    if (!k.vinnerId) uavgjort++
    if (k.avgjoring) straffer++
    const diff = Math.abs(a - b)
    if (diff > 0 && (!storste || diff > storste.diff)) storste = { kampId: k.id, diff }
  }
  for (const k of ferdige) {
    for (const id of [k.deltakerAId, k.deltakerBId]) {
      if (!id) continue
      const res = !k.vinnerId ? (k.walkover ? 'T' : 'U') : k.vinnerId === id ? 'S' : 'T'
      form[id]?.push(res)
      if (res === 'S') {
        rekke[id] = (rekke[id] ?? 0) + 1
        if (!lengste || rekke[id] > lengste.antall) lengste = { deltakerId: id, antall: rekke[id] }
      } else rekke[id] = 0
    }
  }
  for (const id of Object.keys(form)) form[id] = form[id].slice(-5)

  const spiltUtenWo = ferdige.length - walkovers
  return {
    spilt: ferdige.length,
    gjenstaar: ekte.length - ferdige.length,
    totaltMal,
    snittMal: spiltUtenWo ? totaltMal / spiltUtenWo : 0,
    storsteSeier: storste,
    walkovers,
    avgjortPaStraffer: straffer,
    uavgjortProsent: spiltUtenWo ? (uavgjort / spiltUtenWo) * 100 : 0,
    sideA,
    sideB,
    form,
    lengsteSeiersrekke: lengste,
  }
}
