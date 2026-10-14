import { useState } from 'react'
import { sideTekst } from '../core/format'
import { kartTilVinn } from '../core/regler/resultat'
import { kreverVinner } from '../core/regler/status'
import type { Kamp, ResultatInput, Side } from '../core/types'
import type { TurneringData } from '../lib/hooks'
import { useStore } from '../store'
import { Modal } from './ui'

export function ResultatSkjema({
  kamp,
  data,
  onLukk,
}: {
  kamp: Kamp
  data: TurneringData
  onLukk: () => void
}) {
  const { turnering, profil, navn } = data
  const lagreResultat = useStore((s) => s.lagreResultat)
  const lagreWalkover = useStore((s) => s.lagreWalkover)
  const settKampStatus = useStore((s) => s.settKampStatus)
  const krever = kreverVinner(turnering)
  const format = profil.resultatformat

  const [a, setA] = useState<string>(kamp.resultatA !== undefined ? String(kamp.resultatA) : '')
  const [b, setB] = useState<string>(kamp.resultatB !== undefined ? String(kamp.resultatB) : '')
  const [sjakk, setSjakk] = useState<[number, number] | undefined>(
    kamp.resultatA !== undefined && kamp.resultatB !== undefined && format === 'SJAKK'
      ? [kamp.resultatA, kamp.resultatB]
      : undefined,
  )
  const [kart, setKart] = useState<[number, number] | undefined>(
    kamp.resultatA !== undefined && kamp.resultatB !== undefined && format === 'KART'
      ? [kamp.resultatA, kamp.resultatB]
      : undefined,
  )
  const [sA, setSA] = useState('')
  const [sB, setSB] = useState('')
  const [arma, setArma] = useState<Side | undefined>(undefined)
  const [feil, setFeil] = useState<string | undefined>()
  const [visForfall, setVisForfall] = useState(false)

  const nA = a === '' ? NaN : Number(a)
  const nB = b === '' ? NaN : Number(b)
  const likt =
    format === 'MAL' ? nA === nB && !Number.isNaN(nA) : format === 'SJAKK' ? sjakk?.[0] === 0.5 : false
  const trengerStraffer = format === 'MAL' && likt && (krever || !profil.uavgjortTillatt)
  const trengerArma = format === 'SJAKK' && likt && krever

  const lagre = () => {
    let input: ResultatInput
    if (format === 'MAL') {
      if (Number.isNaN(nA) || Number.isNaN(nB)) return setFeil('Fyll inn begge målfeltene.')
      input = { A: nA, B: nB }
      if (trengerStraffer) input.straffer = { A: Number(sA), B: Number(sB) }
    } else if (format === 'SJAKK') {
      if (!sjakk) return setFeil('Velg resultat: 1–0, ½–½ eller 0–1.')
      input = { A: sjakk[0], B: sjakk[1] }
      if (trengerArma) input.armageddonVinner = arma
    } else {
      if (!kart) return setFeil('Velg kartresultatet.')
      input = { A: kart[0], B: kart[1] }
    }
    const res = lagreResultat(kamp.id, input)
    if (!res.ok) return setFeil(res.feil)
    onLukk()
  }

  const forfall = (moette: Side | 'INGEN') => {
    const res = lagreWalkover(kamp.id, moette)
    if (!res.ok) return setFeil(res.feil)
    onLukk()
  }

  const vinn = kartTilVinn(turnering.bestOf ?? 1)
  const kartValg: [number, number][] = [
    ...Array.from({ length: vinn }, (_, k) => [vinn, k] as [number, number]),
    ...Array.from({ length: vinn }, (_, k) => [k, vinn] as [number, number]).reverse(),
  ]

  const nA_navn = navn(kamp.deltakerAId)
  const nB_navn = navn(kamp.deltakerBId)
  const erKamp = kamp.status === 'FERDIG'

  return (
    <Modal tittel={erKamp ? 'Endre resultat' : 'Registrer resultat'} onClose={onLukk}>
      <div className="modal-lag">
        <div>
          {nA_navn}
          {format !== 'KART' && <div className="smaa">{profil.sideNavn.A}</div>}
        </div>
        <div className="vs">VS</div>
        <div>
          {nB_navn}
          {format !== 'KART' && <div className="smaa">{profil.sideNavn.B}</div>}
        </div>
      </div>

      {feil && <div className="feilboks" role="alert">{feil}</div>}

      {format === 'MAL' && (
        <>
          <div className="tall-felt">
            <input type="number" inputMode="numeric" min={0} value={a} onChange={(e) => setA(e.target.value)} aria-label={`Mål ${nA_navn}`} />
            <span>–</span>
            <input type="number" inputMode="numeric" min={0} value={b} onChange={(e) => setB(e.target.value)} aria-label={`Mål ${nB_navn}`} />
          </div>
          {trengerStraffer && (
            <div style={{ marginTop: 16 }}>
              <div className="liten" style={{ marginBottom: 6 }}>
                Uavgjort etter ekstraomganger – skriv inn straffeoppgjøret:
              </div>
              <div className="tall-felt">
                <input type="number" inputMode="numeric" min={0} value={sA} onChange={(e) => setSA(e.target.value)} aria-label="Straffer A" />
                <span>–</span>
                <input type="number" inputMode="numeric" min={0} value={sB} onChange={(e) => setSB(e.target.value)} aria-label="Straffer B" />
              </div>
            </div>
          )}
        </>
      )}

      {format === 'SJAKK' && (
        <>
          <div className="store-knapper">
            {([[1, 0], [0.5, 0.5], [0, 1]] as [number, number][]).map(([x, y]) => (
              <button
                key={`${x}-${y}`}
                className={`stor-knapp ${sjakk?.[0] === x ? 'valgt' : ''}`}
                onClick={() => setSjakk([x, y])}
              >
                {sideTekst(x, profil)}–{sideTekst(y, profil)}
              </button>
            ))}
          </div>
          {trengerArma && (
            <div style={{ marginTop: 16 }}>
              <div className="liten" style={{ marginBottom: 6 }}>
                Remis i cup – hvem vant armageddon-partiet?
              </div>
              <div className="store-knapper fire">
                {(['A', 'B'] as Side[]).map((s) => (
                  <button key={s} className={`stor-knapp mindre ${arma === s ? 'valgt' : ''}`} onClick={() => setArma(s)}>
                    {s === 'A' ? nA_navn : nB_navn}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {format === 'KART' && (
        <>
          <div className="liten" style={{ marginBottom: 6 }}>
            Kartresultat (best av {turnering.bestOf ?? 1})
          </div>
          <div className="store-knapper fire">
            {kartValg.map(([x, y]) => (
              <button
                key={`${x}-${y}`}
                className={`stor-knapp ${kart?.[0] === x && kart?.[1] === y ? 'valgt' : ''}`}
                onClick={() => setKart([x, y])}
              >
                {x}–{y}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="rad" style={{ marginTop: 18 }}>
        <button className="knapp" onClick={lagre} style={{ flex: 1 }}>
          Lagre resultat
        </button>
        {kamp.status === 'PLANLAGT' && (
          <button
            className="knapp sek-knapp"
            onClick={() => {
              settKampStatus(kamp.id, 'PAGAR')
              onLukk()
            }}
          >
            Start kamp
          </button>
        )}
      </div>

      <div className="skille" />
      {!visForfall ? (
        <button className="knapp sek-knapp liten-knapp" onClick={() => setVisForfall(true)}>
          Forfall (walkover)
        </button>
      ) : (
        <div>
          <div className="liten" style={{ marginBottom: 6 }}>
            Den som møtte får seieren ({format === 'KART' ? `${vinn}–0` : `${profil.walkoverResultat.vinner}–${profil.walkoverResultat.taper}`}) og poengene.
          </div>
          <div className="stabel" style={{ display: 'grid', gap: 8 }}>
            <button className="knapp sek-knapp" onClick={() => forfall('B')}>
              {nA_navn} møtte ikke
            </button>
            <button className="knapp sek-knapp" onClick={() => forfall('A')}>
              {nB_navn} møtte ikke
            </button>
            {!krever && (
              <button className="knapp fare" onClick={() => forfall('INGEN')}>
                Ingen møtte
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
