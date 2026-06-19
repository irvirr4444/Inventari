import * as React from 'react'
import { createLokacioni, patchLokacioni } from '../../lib/api/lokacionet'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { useLokacioni } from '../../lib/lokacioni/LokacioniProvider'

type LocationsEditorProps = {
  mode: 'onboarding' | 'settings'
  onComplete?: () => void
}

export function LocationsEditor(props: LocationsEditorProps) {
  const { lokacionet, refresh } = useLokacioni()
  const [emri, setEmri] = React.useState('')
  const [kodi, setKodi] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const addLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!emri.trim() || !kodi.trim()) {
      setError('Emri dhe kodi jane te detyrueshem.')
      return
    }
    setLoading(true)
    try {
      await createLokacioni({
        emri: emri.trim(),
        kodi: kodi.trim().toUpperCase(),
        rradhitja: lokacionet.length,
      })
      setEmri('')
      setKodi('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setLoading(false)
    }
  }

  const deactivate = async (loc: Lokacioni) => {
    const result = await patchLokacioni(loc.id, { aktiv: false })
    if (result.stock_warning) {
      window.alert(result.stock_warning)
    }
    await refresh()
  }

  const activeCount = lokacionet.filter((l) => l.aktiv).length

  return (
    <section className="card auth-card">
      <h1>{props.mode === 'onboarding' ? 'Shto lokacionet e tua' : 'Lokacionet'}</h1>
      <p className="muted">
        {props.mode === 'onboarding'
          ? 'Shto te pakten nje lokacion per te vazhduar ne panel.'
          : 'Menaxho emrat dhe renditjen e lokacioneve.'}
      </p>

      <ul className="locations-list">
        {lokacionet.map((l) => (
          <li key={l.id} className={l.aktiv ? '' : 'muted'}>
            <span>
              {l.emri} ({l.kodi}){!l.aktiv ? ' — jo aktiv' : ''}
            </span>
            {l.aktiv && props.mode === 'settings' ? (
              <button type="button" className="btn" onClick={() => deactivate(l)}>
                Çaktivizo
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <form className="form-grid" onSubmit={addLocation}>
        <div className="form-group">
          <label className="label">Emri</label>
          <input className="input" value={emri} onChange={(e) => setEmri(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Kodi (shkurt)</label>
          <input className="input" value={kodi} onChange={(e) => setKodi(e.target.value)} maxLength={8} />
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" className="btn primary" disabled={loading}>
          Shto lokacion
        </button>
      </form>

      {props.mode === 'onboarding' ? (
        <button
          type="button"
          className="btn primary"
          style={{ marginTop: 12 }}
          disabled={activeCount === 0}
          onClick={props.onComplete}
        >
          Vazhdo ne panel
        </button>
      ) : null}
    </section>
  )
}
