import React from 'react'

export type Country = 'XK' | 'AL'

const STORAGE_KEY = 'inventari.country'

const COUNTRY_META: Record<Country, { name: string; flagSrc: string }> = {
  XK: { name: 'Kosovo', flagSrc: '/Flag_of_Kosovo.webp' },
  AL: { name: 'Albania', flagSrc: '/Flag_of_Albania.svg' },
}

function readStored(): Country {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'AL' ? 'AL' : 'XK'
}

const CountryContext = React.createContext<{
  country: Country
  setCountry: (c: Country) => void
} | null>(null)

export function CountryProvider(props: { children: React.ReactNode }) {
  const [country, setCountryState] = React.useState<Country>(() => readStored())

  const setCountry = React.useCallback((c: Country) => {
    setCountryState(c)
    localStorage.setItem(STORAGE_KEY, c)
  }, [])

  return (
    <CountryContext.Provider value={{ country, setCountry }}>
      {props.children}
    </CountryContext.Provider>
  )
}

export function useCountry() {
  const ctx = React.useContext(CountryContext)
  if (!ctx) throw new Error('useCountry must be used within CountryProvider')
  return ctx
}

export function CountrySelector() {
  const { country, setCountry } = useCountry()
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const active = COUNTRY_META[country]

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="row" style={{ gap: 8 }}>
          <img className="flagIcon" src={active.flagSrc} alt="" />
          <span>{active.name}</span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="card"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            minWidth: 180,
            padding: 8,
            zIndex: 20,
          }}
        >
          {(Object.keys(COUNTRY_META) as Country[]).map((c) => {
            const meta = COUNTRY_META[c]
            return (
              <button
                key={c}
                type="button"
                role="menuitem"
                className="btn"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 8,
                  marginBottom: 6,
                }}
                onClick={() => {
                  setCountry(c)
                  setOpen(false)
                }}
              >
                <img className="flagIcon" src={meta.flagSrc} alt="" />
                <span>{meta.name}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

