import { avgjoringTekst, visResultat } from '../core/format'
import type { Kamp, Spillprofil } from '../core/types'
import { klokkeslett } from '../lib/tid'

interface Props {
  kamp: Kamp
  navn: (id?: string) => string
  profil: Spillprofil
  onVelg?: (k: Kamp) => void
  visDato?: boolean
  turneringsnavn?: string
}

export function KampRad({ kamp, navn, profil, onVelg, turneringsnavn }: Props) {
  if (kamp.erBye) {
    return (
      <div className="kamp-rad">
        <span className="tid">Runde {kamp.runde}</span>
        <span className="lag-a">{navn(kamp.deltakerAId)}</span>
        <span className="score smaa">bye</span>
        <span className="lag-b sek">{kamp.vinnerId ? 'Frirunde (teller som seier)' : 'Frirunde'}</span>
        <span />
      </div>
    )
  }
  const ferdig = kamp.status === 'FERDIG'
  const aVant = ferdig && kamp.vinnerId === kamp.deltakerAId
  const bVant = ferdig && kamp.vinnerId === kamp.deltakerBId
  const klikkbar = !!onVelg && !!kamp.deltakerAId && !!kamp.deltakerBId
  const Tag = klikkbar ? 'button' : 'div'
  const dekor = avgjoringTekst(kamp)
  const sider = profil.resultatformat !== 'KART'

  return (
    <Tag
      className={`kamp-rad ${turneringsnavn ? 'med-turnering' : ''}`}
      {...(klikkbar ? { onClick: () => onVelg!(kamp), type: 'button' as const } : {})}
    >
      <span className="tid">
        {turneringsnavn && <div className="smaa">{turneringsnavn}</div>}
        {klokkeslett(kamp.tidspunkt)}
      </span>
      <span className={`lag-a ${aVant ? 'vant' : bVant ? 'tapt' : ''}`}>
        {navn(kamp.deltakerAId)}
        {sider && <div className="smaa">{profil.sideNavn.A}</div>}
      </span>
      <span className="score">
        {ferdig ? visResultat(kamp, profil) : 'vs'}
        {dekor && <div className="smaa">{dekor}</div>}
      </span>
      <span className={`lag-b ${bVant ? 'vant' : aVant ? 'tapt' : ''}`}>
        {navn(kamp.deltakerBId)}
        {sider && <div className="smaa">{profil.sideNavn.B}</div>}
      </span>
      <span className="status">
        {kamp.status === 'PAGAR' && (
          <span className="merke pagar">
            <span className="live-prikk" />
            Pågår
          </span>
        )}
        {ferdig && kamp.walkover && <span className="merke wo">w.o.</span>}
        {klikkbar && !ferdig && kamp.status !== 'PAGAR' && <span className="merke lilla">Registrer</span>}
      </span>
    </Tag>
  )
}
