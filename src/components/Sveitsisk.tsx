import { tallTekst } from '../core/format'
import { maksRunder, sveitsiskInnstillinger } from '../core/regler/sveitsisk'
import type { TurneringData } from '../lib/hooks'
import { tr } from '../lib/i18n'

/** Swiss stage (GRENSE): deltakere gruppert på rekord med Videre/Ute-markører. */
export function RekordGrupper({ data }: { data: TurneringData }) {
  const { turnering, tabell } = data
  const s = sveitsiskInnstillinger(turnering, data.deltakere.length)
  const grupper = new Map<string, typeof tabell>()
  for (const r of tabell) {
    const key = `${r.seire}-${r.tap}`
    grupper.set(key, [...(grupper.get(key) ?? []), r])
  }
  const sortert = [...grupper.entries()].sort(([a], [b]) => {
    const [as, at] = a.split('-').map(Number)
    const [bs, bt] = b.split('-').map(Number)
    return bs - bt - (as - at) || bs - as
  })

  return (
    <div className="rekord-rutenett">
      {sortert.map(([key, rader]) => {
        const [seire, tap] = key.split('-').map(Number)
        const videre = seire >= s.seireForVidere
        const ute = tap >= s.tapForUte
        return (
          <div className="rekord-gruppe" key={key}>
            <div className="rekord-hode">
              <span className="overskrift">
                {seire}–{tap}
              </span>
              {videre && <span className="merke videre">{tr('Videre')}</span>}
              {ute && <span className="merke ute">{tr('Ute')}</span>}
              {!videre && !ute && <span className="merke lilla">{tr('I spill')}</span>}
            </div>
            {rader.map((r) => (
              <div className="rekord-rad" key={r.deltakerId}>
                <span style={{ fontWeight: 600 }}>{r.navn}</span>
                <span className="liten">BH {tallTekst(r.bh)}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export function RundeIndikator({ data }: { data: TurneringData }) {
  const { turnering, kamper, deltakere } = data
  const naa = kamper.reduce((m, k) => Math.max(m, k.runde), 0)
  const maks = maksRunder(turnering, deltakere.length)
  const s = sveitsiskInnstillinger(turnering, deltakere.length)
  return (
    <span className="merke lilla">
      {tr('Runde')} {naa} {tr('av')} {s.modus === 'RUNDER' ? maks : `${tr('maks')} ${maks}`}
    </span>
  )
}
