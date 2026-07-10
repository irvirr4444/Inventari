import { Link } from 'react-router-dom'
import { AuthBrandMark } from '../components/AuthBrandMark'

export function LegalPageShell(props: { title: string; children: React.ReactNode }) {
  return (
    <main className="container legal-container">
      <article className="legal-card">
        <nav className="legal-auth-links" aria-label="Hyrje dhe regjistrim">
          <Link to="/login" className="legal-auth-link">
            Hyr
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/login?mode=signup" className="legal-auth-link">
            Regjistrohu
          </Link>
        </nav>
        <header className="legal-header">
          <AuthBrandMark />
          <h1>{props.title}</h1>
          <p className="legal-updated">Përditësuar: 27 qershor 2026</p>
        </header>
        <div className="legal-body">{props.children}</div>
      </article>
    </main>
  )
}
