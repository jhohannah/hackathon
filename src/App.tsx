import { HashRouter, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { Trofe } from './components/Ikoner'
import { Admin } from './pages/Admin'
import { Oversikt } from './pages/Oversikt'
import { Pamelding } from './pages/Pamelding'
import { TurneringSide } from './pages/Turnering'

function TurneringMedNokkel() {
  const { id } = useParams()
  return <TurneringSide key={id} />
}

export default function App() {
  const lenke = ({ isActive }: { isActive: boolean }) => (isActive ? 'aktiv' : undefined)
  return (
    <HashRouter>
      <header className="topp">
        <div className="topp-inn">
          <NavLink to="/" className="logo">
            <Trofe className="" />
            Nome Games
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end className={lenke}>
              Turneringer
            </NavLink>
            <NavLink to="/pamelding" className={lenke}>
              Påmelding
            </NavLink>
            <NavLink to="/admin" className={lenke}>
              Admin
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="side">
        <Routes>
          <Route path="/" element={<Oversikt />} />
          <Route path="/turnering/:id" element={<TurneringMedNokkel />} />
          <Route path="/pamelding" element={<Pamelding />} />
          <Route path="/pamelding/:id" element={<Pamelding />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<div className="kort tom">Siden finnes ikke.</div>} />
        </Routes>
      </main>
    </HashRouter>
  )
}
