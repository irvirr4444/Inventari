import * as React from 'react'
import { Link } from 'react-router-dom'

type LogEntryProps = {
  timestamp: string
  batchId: string
  action: string
  actionColor: string
  product: string
  qty: string
  location: string
  user: string
}

function withAlpha(hex: string, alphaHex: string) {
  if (!hex.startsWith('#') || hex.length !== 7) return hex
  return `${hex}${alphaHex}`
}

function LogEntry(props: LogEntryProps) {
  return (
    <div className="landing-logentry">
      <div className="landing-logentry__meta">
        <span>{props.timestamp}</span>
        <span>{props.batchId}</span>
        <span
          className="landing-logentry__badge"
          style={{
            color: props.actionColor,
            backgroundColor: withAlpha(props.actionColor, '1A'),
          }}
        >
          {props.action.toUpperCase()}
        </span>
      </div>

      <div className="landing-logentry__product">{props.product}</div>

      <div className="landing-logentry__row3">
        <span className="landing-logentry__qty" style={{ color: props.actionColor }}>
          {props.qty}
        </span>
        <span className="landing-logentry__loc">{props.location}</span>
        <span className="landing-logentry__user">{props.user}</span>
      </div>
    </div>
  )
}

function EdgeStatement(props: { text: string }) {
  return (
    <div className="landing-edge__item">
      <p>{props.text}</p>
    </div>
  )
}

export function LandingPage() {
  const [animateIn, setAnimateIn] = React.useState(false)

  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setAnimateIn(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  return (
    <div className={`landing-container ${animateIn ? 'landing-enter' : ''}`}>
      <nav className="landing-nav">
        <div className="landing-nav__inner">
          <Link className="landing-brand" to="/">
            <img
              className="landing-brand__logo"
              src="/inventari-profile-icon-88.png"
              alt="Inventari"
              width={44}
              height={44}
              decoding="async"
              fetchPriority="high"
            />
            <span className="landing-brand__text">Inventari Im</span>
          </Link>

          <div className="landing-nav__links">
            <Link className="landing-nav__link" to="/login">
              Hyr
            </Link>
            <Link className="landing-nav__link landing-nav__cta" to="/signup">
              Regjistrohu
            </Link>
          </div>
        </div>
      </nav>

      <section className="landing-section">
        <div className="landing-hero">
          <div>
            <h1 className="landing-title">
              <span className="landing-title__line">Boll më me faqe excel</span>
              <span className="landing-title__line">dhe fatura dore.</span>
            </h1>
            <p className="landing-subtitle">
              Shih çfarë ke, ku e ke, dhe kush e ka lëvizur.
            </p>
          </div>

          <div className="landing-logcard-wrap">
            <div className="landing-logcard" aria-label="Historiku (shembull)">
              <div className="landing-logcard__head">
                <span className="landing-logcard__label">Historiku</span>
                <span className="landing-logcard__count">3 hyrje</span>
              </div>

              <div>
                <LogEntry
                  timestamp="2025-07-14 08:42"
                  batchId="LOT-2847"
                  action="Hyrje"
                  actionColor="#34D399"
                  product="Bojë murale 15L — Gri Hapur"
                  qty="+24 copë"
                  location="Magazina Tiranë"
                  user="Arjeta Krasniqi"
                />
                <LogEntry
                  timestamp="2025-07-14 11:17"
                  batchId="LOT-2851"
                  action="Dalje"
                  actionColor="#F87171"
                  product="Tuba PVC 110mm — 6m"
                  qty="−8 copë"
                  location="Magazina Tiranë"
                  user="Blendi Hoxha"
                />
                <LogEntry
                  timestamp="2025-07-14 14:03"
                  batchId="LOT-2856"
                  action="Transfer"
                  actionColor="#FBBF24"
                  product="Kabllo NYM 3×2.5mm²"
                  qty="50 m"
                  location="Tiranë → Prishtinë"
                  user="Endri Leka"
                />
              </div>

              <div className="landing-logcard__foot">
                <span className="landing-pulse" aria-hidden="true" />
                <span className="landing-logcard__count">Live — përditësohet në kohë reale</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-divider-top">
        <div className="landing-section" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="landing-edge">
            <EdgeStatement text="Çdo ndryshim regjistrohet vetvetiu. Nuk ka më 'kush e preku këtë?'" />
            <EdgeStatement text="Stoku i çdo lokacioni, i përditësuar në kohë reale." />
            <EdgeStatement text="Eksporto në Excel, PDF apo Word, saktësisht siç e kërkon kontabiliteti." />
          </div>
        </div>
      </section>

      <section className="landing-divider-top">
        <div className="landing-section landing-cta">
          <Link className="landing-cta__button" to="/signup">
            Regjistrohu
          </Link>
        </div>
      </section>
    </div>
  )
}

