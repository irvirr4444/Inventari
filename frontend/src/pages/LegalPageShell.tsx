import { NavLink, useNavigate } from 'react-router-dom'
import { AuthBrandMark } from '../components/AuthBrandMark'

export function LegalPageShell(props: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate()

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/login')
  }

  return (
    <main className="container legal-container">
      <article className="legal-card">
        <header className="legal-header">
          <AuthBrandMark />
          <h1>{props.title}</h1>
          <p className="legal-updated">Përditësuar: 27 qershor 2026</p>
        </header>
        <div className="legal-body">{props.children}</div>
        <footer className="legal-footer">
          <NavLink
            to="/privacy"
            className={({ isActive }) => (isActive ? 'is-active' : undefined)}
          >
            Politika e privatësisë
          </NavLink>
          <span className="legal-footer-sep" aria-hidden="true">
            ·
          </span>
          <NavLink to="/terms" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
            Kushtet e përdorimit
          </NavLink>
          <span className="legal-footer-sep" aria-hidden="true">
            ·
          </span>
          <button type="button" className="legal-footer-back" onClick={goBack}>
            ← Kthehu
          </button>
        </footer>
      </article>
    </main>
  )
}
