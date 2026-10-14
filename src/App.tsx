import { useEffect } from 'react'
import { HashRouter, Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { Trofe } from './components/Ikoner'
import { Krev } from './components/Krev'
import { TemaBryter } from './components/TemaBryter'
import { erAdmin, useAuth } from './lib/auth'
import { tr, useSprak } from './lib/i18n'
import { useUi } from './lib/ui'
import { Admin } from './pages/Admin'
import { LoggInn } from './pages/LoggInn'
import { Oversikt } from './pages/Oversikt'
import { Pamelding } from './pages/Pamelding'
import { TurneringSide } from './pages/Turnering'

function TurneringMedNokkel() {
  const { id } = useParams()
  return <TurneringSide key={id} />
}

export default function App() {
  const dramatisk = useUi((u) => u.dramatisk)
  const settDramatisk = useUi((u) => u.settDramatisk)
  const tema = useUi((u) => u.tema)
  const sprak = useSprak((x) => x.sprak)
  const settSprak = useSprak((x) => x.settSprak)
  const bruker = useAuth((a) => a.bruker)
  const loggUt = useAuth((a) => a.loggUt)
  useEffect(() => {
    document.documentElement.dataset.dramatisk = dramatisk ? '1' : '0'
  }, [dramatisk])
  useEffect(() => {
    document.documentElement.lang = sprak
  }, [sprak])
  useEffect(() => {
    document.documentElement.dataset.tema = tema
  }, [tema])
  const lenke = ({ isActive }: { isActive: boolean }) => (isActive ? 'aktiv' : undefined)
  return (
    <HashRouter>
      <header className="topp">
        <div className="topp-inn">
          <NavLink to="/" className="logo">
            <Trofe className="" />
            {tr('Nome Games')}
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end className={lenke}>
              {tr('Turneringer')}
            </NavLink>
            <NavLink to="/pamelding" className={lenke}>
              {tr('Påmelding')}
            </NavLink>
            {erAdmin(bruker) && (
              <NavLink to="/admin" className={lenke}>
                {tr('Admin')}
              </NavLink>
            )}
          </nav>
          <div className="topp-hoyre">
            <div className="sprak-bryter" role="group" aria-label={tr('Språk')}>
              {(['no', 'en'] as const).map((k) => (
                <button key={k} type="button" className={sprak === k ? 'aktiv' : ''} aria-pressed={sprak === k} onClick={() => settSprak(k)}>
                  {k === 'no' ? 'NO' : 'EN'}
                </button>
              ))}
            </div>
            <TemaBryter />
          <button
            className="dram-knapp"
            aria-pressed={dramatisk}
            onClick={() => settDramatisk(!dramatisk)}
            title={tr('Dramatisk modus: alt i store bokstaver med gulldetaljer')}
          >
            {tr('Dramatisk modus')}
          </button>
            {bruker ? (
              <div className="bruker-boks">
                <span className="bruker-navn" title={bruker.rolle === 'ADMIN' ? 'Admin' : 'Deltaker'}>
                  {bruker.rolle === 'DELTAKER' && bruker.navn}
                  <span className="merke rolle">{bruker.rolle === 'ADMIN' ? tr('Admin') : tr('Deltaker')}</span>
                </span>
                <button className="dram-knapp" onClick={loggUt}>
                  {tr('Logg ut')}
                </button>
              </div>
            ) : (
              <Link to="/logg-inn" className="dram-knapp">
                {tr('Logg inn')}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="side" key={sprak}>
        <Routes>
          <Route path="/" element={<Oversikt />} />
          <Route path="/turnering/:id" element={<TurneringMedNokkel />} />
          <Route path="/logg-inn" element={<LoggInn />} />
          <Route
            path="/pamelding"
            element={
              <Krev roller={['DELTAKER', 'ADMIN']} hva="melde deg på turneringer">
                <Pamelding />
              </Krev>
            }
          />
          <Route
            path="/pamelding/:id"
            element={
              <Krev roller={['DELTAKER', 'ADMIN']} hva="melde deg på turneringer">
                <Pamelding />
              </Krev>
            }
          />
          <Route
            path="/admin"
            element={
              <Krev roller={['ADMIN']} hva="opprette og endre turneringer">
                <Admin />
              </Krev>
            }
          />
          <Route path="*" element={<div className="kort tom">{tr('Siden finnes ikke.')}</div>} />
        </Routes>
      </main>
    </HashRouter>
  )
}
