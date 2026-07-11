import * as React from 'react'
import { createLokacioni, deleteLokacioni, patchLokacioni } from '../../lib/api/lokacionet'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { useLokacioni } from '../../lib/lokacioni/LokacioniProvider'
import { randomId } from '../../lib/randomId'
import { SettingsSectionHeading } from '../settings/SettingsSectionHeading'
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
  onBack?: () => void | Promise<void>
  hideSummaryAndReorder?: boolean
}

function newDraft(): DraftLocation {
  return { key: randomId(), emri: '', flagEmoji: DEFAULT_LOCATION_EMOJI }
}

export function LocationsEditor(props: LocationsEditorProps) {
  const { lokacionet, refresh } = useLokacioni()
  const [drafts, setDrafts] = React.useState<DraftLocation[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Lokacioni | null>(null)
  const [search, setSearch] = React.useState('')

  const activeLocations = React.useMemo(
    () => [...lokacionet.filter((l) => l.aktiv)].sort((a, b) => a.rradhitja - b.rradhitja),
    [lokacionet],
  )
  const displayedLocations = React.useMemo(
    () =>
      props.mode === 'settings'
        ? lokacionet.filter((loc) => loc.aktiv || loc.show_in_summary).sort((a, b) => {
            if (a.aktiv !== b.aktiv) return a.aktiv ? -1 : 1
            return a.rradhitja - b.rradhitja
          })
        : activeLocations,
    [activeLocations, lokacionet, props.mode],
  )
  const filteredLocations = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return displayedLocations
    return displayedLocations.filter((loc) => loc.emri.toLowerCase().includes(query))
  }, [displayedLocations, search])

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
      setError('Emri i vendndodhjes eshte i detyrueshem.')
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

  const activate = async (loc: Lokacioni) => {
    await patchLocation(loc.id, { aktiv: true })
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

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setError(null)
    setSavingKey(deleteTarget.id)
    try {
      await deleteLokacioni(deleteTarget.id)
      setDeleteTarget(null)
      await refresh()
    } catch (err) {
      setDeleteTarget(null)
      setError(err instanceof Error ? err.message : 'Gabim gjate fshirjes.')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <section className="auth-card locations-editor">
      {props.mode === 'onboarding' ? (
        <>
          <div className="locations-onboarding-header">
            {props.onBack ? (
              <button
                type="button"
                className="btn ghost locations-back-btn"
                onClick={() => props.onBack?.()}
              >
                Kthehu te hyrja
              </button>
            ) : null}
          </div>
          <h1>Si quhen vendndodhjet e tua?</h1>
          <p className="muted">Mund t&apos;i shtosh ose ndryshosh me vone.</p>
        </>
      ) : (
        <>
          <div className="locations-editor-heading">
            <div className="locations-editor-heading-title">
              <SettingsSectionHeading
                as="h1"
                label="Vendndodhjet"
                count={filteredLocations.length}
              />
            </div>
            <div className="locations-editor-heading-actions">
              <button type="button" className="btn sm location-add-btn" onClick={addDraftCard}>
                + Shto vendndodhje
              </button>
            </div>
          </div>
          <div className="settings-search-row">
            <label className="settings-search-field">
              <span aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                value={search}
                placeholder="Kërko vendndodhje..."
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="locations-list-header" aria-hidden="true">
            <span>Vendndodhja</span>
          </div>
        </>
      )}

      <div
        className={`location-card-grid${
          filteredLocations.length + drafts.length > 5 ? ' location-card-grid-scroll' : ''
        }`}
      >
        {filteredLocations.map((loc) => {
          const activeIndex = activeLocations.findIndex((active) => active.id === loc.id)
          return (
          <LocationCard
            key={loc.id}
            emri={loc.emri}
            flagEmoji={locationDisplayEmoji(loc.flag_emoji)}
            className={!loc.aktiv ? 'location-card-inactive' : undefined}
            readOnly={props.mode === 'onboarding' || !loc.aktiv}
            onEmriBlur={
              props.mode === 'settings' && loc.aktiv ? (value) => commitName(loc, value) : undefined
            }
            onEmojiChange={
              props.mode === 'settings' && loc.aktiv
                ? (emoji) => patchLocation(loc.id, { flag_emoji: emoji })
                : undefined
            }
            actions={
              props.mode === 'settings' ? (
                <>
                  {loc.aktiv && !props.hideSummaryAndReorder ? (
                    <>
                      <div className="location-reorder-buttons">
                        <button
                          type="button"
                          className="btn sm"
                          disabled={activeIndex === 0 || savingKey === loc.id}
                          aria-label="Lart"
                          onClick={() => moveLocation(loc, 'up')}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn sm"
                          disabled={
                            activeIndex === activeLocations.length - 1 || savingKey === loc.id
                          }
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
                          onChange={(e) =>
                            patchLocation(loc.id, { show_in_summary: e.target.checked })
                          }
                        />
                        Shfaq ne Përmbledhje
                      </label>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className={
                      loc.aktiv ? 'btn sm settings-status-toggle-btn' : 'btn sm primary'
                    }
                    onClick={() => (loc.aktiv ? deactivate(loc) : activate(loc))}
                    disabled={savingKey === loc.id}
                  >
                    {loc.aktiv ? (
                      <svg
                        aria-hidden="true"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2v10" />
                        <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                    {loc.aktiv ? 'Çaktivizo' : 'Riaktivizo'}
                  </button>
                  <button
                    type="button"
                    className="btn sm danger"
                    onClick={() => setDeleteTarget(loc)}
                    disabled={savingKey === loc.id}
                  >
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v5" />
                      <path d="M14 11v5" />
                    </svg>
                    Fshi
                  </button>
                </>
              ) : null
            }
          />
          )
        })}

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
                  className="btn sm location-draft-cancel-btn"
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
                  {savingKey === draft.key ? 'Duke shtuar…' : 'Shto vendndodhjen'}
                </button>
              </div>
            }
          />
        ))}
      </div>

      {props.mode === 'onboarding' ? (
        <button type="button" className="btn location-add-btn" onClick={addDraftCard}>
          + Shto vendndodhje
        </button>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      {deleteTarget ? (
        <ConfirmModal
          title="Fshi vendndodhjen?"
          message={`Vendndodhja "${deleteTarget.emri}" do të fshihet. Pas këtij veprimi nuk do mund të kryeni veprime nga/te kjo vendndodhje por të dhënat historike do të ruhen.`}
          confirmLabel={savingKey === deleteTarget.id ? 'Duke fshire…' : 'Fshi'}
          tone="danger"
          loading={savingKey === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}

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
