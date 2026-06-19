import * as React from 'react'
import { createLokacioni, patchLokacioni } from '../../lib/api/lokacionet'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { useLokacioni } from '../../lib/lokacioni/LokacioniProvider'
import { randomId } from '../../lib/randomId'
import { LocationCard } from './LocationCard'
import { DEFAULT_LOCATION_EMOJI, locationDisplayEmoji } from './LocationEmojiPicker'

type DraftLocation = {
  key: string
  emri: string
  flagEmoji: string
}

type LocationsEditorProps = {
  mode: 'onboarding' | 'settings'
  onComplete?: () => void
}

function newDraft(): DraftLocation {
  return { key: randomId(), emri: '', flagEmoji: DEFAULT_LOCATION_EMOJI }
}

export function LocationsEditor(props: LocationsEditorProps) {
  const { lokacionet, refresh } = useLokacioni()
  const [drafts, setDrafts] = React.useState<DraftLocation[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [savingKey, setSavingKey] = React.useState<string | null>(null)

  const activeLocations = React.useMemo(
    () => [...lokacionet.filter((l) => l.aktiv)].sort((a, b) => a.rradhitja - b.rradhitja),
    [lokacionet],
  )
  const inactiveLocations = lokacionet.filter((l) => !l.aktiv)

  const addDraftCard = () => {
    setDrafts((prev) => [...prev, newDraft()])
    setError(null)
  }

  const updateDraft = (key: string, patch: Partial<DraftLocation>) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  const removeDraft = (key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key))
  }

  const saveDraft = async (draft: DraftLocation) => {
    const emri = draft.emri.trim()
    if (!emri) {
      setError('Emri i lokacionit eshte i detyrueshem.')
      return
    }
    setError(null)
    setSavingKey(draft.key)
    try {
      await createLokacioni({
        emri,
        flag_emoji: draft.flagEmoji,
        rradhitja: lokacionet.length,
      })
      removeDraft(draft.key)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setSavingKey(null)
    }
  }

  const patchLocation = async (
    id: string,
    patch: Partial<Pick<Lokacioni, 'emri' | 'flag_emoji' | 'rradhitja' | 'show_in_summary' | 'aktiv'>>,
  ) => {
    setError(null)
    try {
      const result = await patchLokacioni(id, patch)
      if (result.stock_warning) {
        window.alert(result.stock_warning)
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim')
    }
  }

  const deactivate = async (loc: Lokacioni) => {
    await patchLocation(loc.id, { aktiv: false })
  }

  const moveLocation = async (loc: Lokacioni, direction: 'up' | 'down') => {
    const idx = activeLocations.findIndex((l) => l.id === loc.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swapIdx < 0 || swapIdx >= activeLocations.length) return
    const other = activeLocations[swapIdx]
    setSavingKey(loc.id)
    try {
      await patchLokacioni(loc.id, { rradhitja: other.rradhitja })
      await patchLokacioni(other.id, { rradhitja: loc.rradhitja })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setSavingKey(null)
    }
  }

  const commitName = async (loc: Lokacioni, raw: string) => {
    const next = raw.trim()
    if (!next || next === loc.emri) return
    await patchLocation(loc.id, { emri: next })
  }

  return (
    <section className="card auth-card locations-editor">
      {props.mode === 'onboarding' ? (
        <>
          <h1>Si quhen lokacionet e tua?</h1>
          <p className="muted">Mund t&apos;i shtosh ose ndryshosh me vone.</p>
        </>
      ) : (
        <>
          <h1>Lokacionet</h1>
          <p className="muted">Menaxho emrat, ikonat dhe renditjen e lokacioneve.</p>
        </>
      )}

      <div className="location-card-grid">
        {activeLocations.map((loc, index) => (
          <LocationCard
            key={loc.id}
            emri={loc.emri}
            flagEmoji={locationDisplayEmoji(loc.flag_emoji)}
            readOnly={props.mode === 'onboarding'}
            onEmriBlur={
              props.mode === 'settings' ? (value) => commitName(loc, value) : undefined
            }
            onEmojiChange={
              props.mode === 'settings'
                ? (emoji) => patchLocation(loc.id, { flag_emoji: emoji })
                : undefined
            }
            actions={
              props.mode === 'settings' ? (
                <>
                  <div className="location-reorder-buttons">
                    <button
                      type="button"
                      className="btn sm"
                      disabled={index === 0 || savingKey === loc.id}
                      aria-label="Lart"
                      onClick={() => moveLocation(loc, 'up')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={index === activeLocations.length - 1 || savingKey === loc.id}
                      aria-label="Poshte"
                      onClick={() => moveLocation(loc, 'down')}
                    >
                      ↓
                    </button>
                  </div>
                  <label className="locations-summary-toggle">
                    <input
                      type="checkbox"
                      checked={loc.show_in_summary}
                      onChange={(e) => patchLocation(loc.id, { show_in_summary: e.target.checked })}
                    />
                    Shfaq ne Permbledhje
                  </label>
                  <button type="button" className="btn sm" onClick={() => deactivate(loc)}>
                    Çaktivizo
                  </button>
                </>
              ) : null
            }
          />
        ))}

        {drafts.map((draft) => (
          <LocationCard
            key={draft.key}
            emri={draft.emri}
            flagEmoji={draft.flagEmoji}
            onEmriChange={(value) => updateDraft(draft.key, { emri: value })}
            onEmojiChange={(emoji) => updateDraft(draft.key, { flagEmoji: emoji })}
            footer={
              <div className="location-draft-actions">
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => removeDraft(draft.key)}
                  disabled={savingKey === draft.key}
                >
                  Anulo
                </button>
                <button
                  type="button"
                  className="btn sm primary"
                  disabled={savingKey === draft.key || !draft.emri.trim()}
                  onClick={() => saveDraft(draft)}
                >
                  {savingKey === draft.key ? 'Duke shtuar…' : 'Shto lokacionin'}
                </button>
              </div>
            }
          />
        ))}
      </div>

      <button type="button" className="btn location-add-btn" onClick={addDraftCard}>
        + Shto Lokacion
      </button>

      {inactiveLocations.length > 0 && props.mode === 'settings' ? (
        <ul className="locations-inactive-list muted">
          {inactiveLocations.map((l) => (
            <li key={l.id}>
              <span>{locationDisplayEmoji(l.flag_emoji)}</span>
              <span>{l.emri}</span>
              <span> — jo aktiv</span>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      {props.mode === 'onboarding' ? (
        <button
          type="button"
          className="btn primary locations-continue-btn"
          disabled={activeLocations.length === 0}
          onClick={props.onComplete}
        >
          Vazhdo
        </button>
      ) : null}
    </section>
  )
}
