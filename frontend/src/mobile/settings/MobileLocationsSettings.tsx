import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckIcon, DeleteIcon, EditIcon, PowerOffIcon, PowerOnIcon } from '../../components/icons'
import { InputClearButton } from '../../components/InputClearButton'
import { createLokacioni, deleteLokacioni, patchLokacioni } from '../../lib/api/lokacionet'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { locationBadge, useLokacioni } from '../../lib/lokacioni/LokacioniProvider'
import { useAuth } from '../../lib/auth/AuthProvider'
import { isAdmin } from '../../lib/permissions'
import { queryKeys } from '../../lib/queryKeys'
import {
  DEFAULT_LOCATION_EMOJI,
  LocationEmojiPicker,
  locationDisplayEmoji,
} from '../../features/locations/LocationEmojiPicker'
import { SheetNav } from '../components/SheetNav'
import { MobileFieldChevron } from '../components/MobileFieldChevron'
import {
  emptySettingsSheetChrome,
  useSettingsSheetChrome,
  type SettingsSheetChromeState,
} from '../components/SettingsSheetChrome'
import { SheetActionFooter, SheetFooterRow } from '../components/SheetActions'
import { useScreenStack } from '../hooks/useScreenStack'

type LocationsScreen =
  | { type: 'list' }
  | { type: 'detail'; location: Lokacioni }
  | { type: 'delete'; location: Lokacioni }
  | { type: 'add' }

const LOCATIONS_LIST_SCREEN: LocationsScreen = { type: 'list' }
const LOCATION_ADD_FORM_ID = 'mobile-location-add-form'

function locationsScreenKey(screen: LocationsScreen): string {
  switch (screen.type) {
    case 'list':
      return 'list'
    case 'detail':
      return `detail-${screen.location.id}`
    case 'delete':
      return `delete-${screen.location.id}`
    case 'add':
      return 'add'
    default:
      return 'unknown'
  }
}

export function MobileLocationsSettings(props: {
  onNotify: (message: string, variant?: 'success' | 'default' | 'error') => void
  onChromeChange?: (chrome: SettingsSheetChromeState) => void
}) {
  const { lokacionet, refresh } = useLokacioni()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const setChrome = useSettingsSheetChrome(props.onChromeChange)
  const stack = useScreenStack<LocationsScreen>(LOCATIONS_LIST_SCREEN)
  const { nav, screens, current, depth, push, pop, reset, canPop, panelCount, panelWidth, trackStyle, transitionLocked, animating } = stack

  const [search, setSearch] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [savingId, setSavingId] = React.useState<string | null>(null)

  const [detailDraft, setDetailDraft] = React.useState<{
    id: string
    emri: string
    emoji: string
  } | null>(null)
  const [detailEditingId, setDetailEditingId] = React.useState<string | null>(null)

  const [addEmri, setAddEmri] = React.useState('')
  const [addEmoji, setAddEmoji] = React.useState(DEFAULT_LOCATION_EMOJI)
  const [addSaving, setAddSaving] = React.useState(false)
  const [addError, setAddError] = React.useState<string | null>(null)

  const displayed = React.useMemo(
    () =>
      lokacionet
        .filter((loc) => loc.aktiv || loc.show_in_summary)
        .sort((a, b) => {
          if (a.aktiv !== b.aktiv) return a.aktiv ? -1 : 1
          return a.rradhitja - b.rradhitja
        }),
    [lokacionet],
  )

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return displayed
    return displayed.filter((loc) => loc.emri.toLowerCase().includes(query))
  }, [displayed, search])

  React.useEffect(() => () => setChrome(emptySettingsSheetChrome), [setChrome])

  const patchLocation = async (
    id: string,
    patch: Partial<Pick<Lokacioni, 'emri' | 'flag_emoji' | 'show_in_summary' | 'aktiv'>>,
  ) => {
    setSavingId(id)
    setError(null)
    try {
      const result = await patchLokacioni(id, patch)
      if (result.stock_warning) props.onNotify(result.stock_warning, 'default')
      await refresh()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gabim'
      setError(message)
      props.onNotify(message, 'error')
      return false
    } finally {
      setSavingId(null)
    }
  }

  const activeDetailLocation =
    current.type === 'detail'
      ? (lokacionet.find((loc) => loc.id === current.location.id) ?? current.location)
      : null

  const detailDirty = Boolean(
    detailDraft &&
      activeDetailLocation &&
      detailDraft.id === activeDetailLocation.id &&
      (detailDraft.emri.trim() !== activeDetailLocation.emri ||
        detailDraft.emoji !== locationDisplayEmoji(activeDetailLocation.flag_emoji)),
  )

  React.useEffect(() => {
    if (!activeDetailLocation) return
    setDetailDraft((prev) => {
      if (prev?.id === activeDetailLocation.id) return prev
      return {
        id: activeDetailLocation.id,
        emri: activeDetailLocation.emri,
        emoji: locationDisplayEmoji(activeDetailLocation.flag_emoji),
      }
    })
  }, [activeDetailLocation])

  React.useEffect(() => {
    if (!activeDetailLocation) {
      setDetailEditingId(null)
      return
    }
    setDetailEditingId((prev) => (prev === activeDetailLocation.id ? prev : null))
  }, [activeDetailLocation])

  const detailEditing = Boolean(activeDetailLocation && detailEditingId === activeDetailLocation.id)

  const saveDetailDraft = React.useCallback(async () => {
    if (!activeDetailLocation || !detailDraft) return true
    if (detailDraft.id !== activeDetailLocation.id) return true
    const nextEmri = detailDraft.emri.trim()
    if (!nextEmri) {
      props.onNotify('Emri i vendndodhjes eshte i detyrueshem.', 'error')
      return false
    }
    if (!detailDirty) return true
    const ok = await patchLocation(activeDetailLocation.id, {
      emri: nextEmri,
      flag_emoji: detailDraft.emoji,
    })
    if (ok) props.onNotify('Ndryshimet u ruajtën me sukses', 'success')
    return ok
  }, [activeDetailLocation, detailDirty, detailDraft, props, patchLocation])

  const saveAndExitDetailEdit = React.useCallback(async () => {
    const ok = await saveDetailDraft()
    if (ok) pop()
    return ok
  }, [pop, saveDetailDraft])

  const confirmDelete = async () => {
    if (current.type !== 'delete') return
    setSavingId(current.location.id)
    setError(null)
    try {
      await deleteLokacioni(current.location.id)
      props.onNotify('Vendndodhja u fshi.', 'success')
      reset()
      await refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gabim gjate fshirjes.'
      setError(message)
      props.onNotify(message, 'error')
    } finally {
      setSavingId(null)
    }
  }

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = addEmri.trim()
    if (!name) {
      setAddError('Emri i vendndodhjes eshte i detyrueshem.')
      return
    }
    setAddError(null)
    setAddSaving(true)
    try {
      const loc = await createLokacioni({
        emri: name,
        flag_emoji: addEmoji,
        rradhitja: lokacionet.length,
      })
      queryClient.setQueryData<Lokacioni[]>(queryKeys.lokacionet(user?.id), (prev) => {
        const list = prev ?? lokacionet
        if (list.some((l) => l.id === loc.id)) return list
        return [...list, loc]
      })
      await refresh()
      setAddEmri('')
      setAddEmoji(DEFAULT_LOCATION_EMOJI)
      props.onNotify('Vendndodhja u shtua me sukses.', 'success')
      reset()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setAddSaving(false)
    }
  }

  const openAdd = () => {
    setAddEmri('')
    setAddEmoji(DEFAULT_LOCATION_EMOJI)
    setAddError(null)
    setAddSaving(false)
    push({ type: 'add' })
  }

  React.useEffect(() => {
    if (depth === 0) {
      setChrome({ depth: 0 })
      return
    }

    const onPop = pop
    let chrome: SettingsSheetChromeState = { depth, onPop }

    switch (current.type) {
      case 'detail':
        chrome = {
          depth,
          title: null,
          onPop: () => {
            if (!detailEditing) {
              pop()
              return
            }
            void saveDetailDraft().then((ok) => {
              if (ok) pop()
            })
          },
        }
        break
      case 'delete':
        chrome = {
          depth,
          title: 'Fshi vendndodhjen?',
          onPop,
          footer: (
            <SheetActionFooter
              onCancel={pop}
              confirmLabel={savingId ? 'Duke fshire…' : 'Fshi'}
              confirmLoading={Boolean(savingId)}
              confirmVariant="danger"
              confirmIcon="delete"
              onConfirm={() => void confirmDelete()}
            />
          ),
        }
        break
      case 'add':
        chrome = {
          depth,
          title: 'Shto vendndodhje',
          onPop,
          footer: (
            <SheetActionFooter
              onCancel={pop}
              confirmLabel={addSaving ? 'Duke shtuar…' : 'Shto'}
              confirmLoading={addSaving}
              confirmDisabled={!addEmri.trim()}
              confirmType="submit"
              confirmIcon="plus"
              form={LOCATION_ADD_FORM_ID}
            />
          ),
        }
        break
      default:
        chrome = { depth: 0 }
    }

    setChrome(chrome)
  }, [addEmri, addSaving, current, depth, detailEditing, pop, savingId, saveDetailDraft, setChrome])

  const renderScreen = (screen: LocationsScreen) => {
    switch (screen.type) {
      case 'list':
        return (
          <div className="mobile-settings-content">
            <span className={`clearable-field${search ? ' clearable-field--has-value' : ''}`}>
              <input
                type="search"
                className="mobile-input clearable-field__control"
                value={search}
                placeholder="Kërko vendndodhje…"
                onChange={(e) => setSearch(e.target.value)}
              />
              <InputClearButton className="clearable-field__clear" onClick={() => setSearch('')} />
            </span>

            {error ? <div className="mobile-inline-error">{error}</div> : null}

            <div className="mobile-list-stack">
              {filtered.length === 0 ? (
                <div className="mobile-picker-empty">Nuk u gjet vendndodhje.</div>
              ) : (
                filtered.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    className={`mobile-tap-field${!loc.aktiv ? ' mobile-tap-field-muted' : ''}`}
                    onClick={() => push({ type: 'detail', location: loc })}
                  >
                    <span className="mobile-location-option">
                      <span className="mobile-location-option-emoji" aria-hidden="true">
                        {locationBadge(loc)}
                      </span>
                      <span className="mobile-location-option-name">{loc.emri}</span>
                      {!loc.aktiv ? <span className="mobile-card-meta">Çaktivizuar</span> : null}
                    </span>
                    <MobileFieldChevron />
                  </button>
                ))
              )}

              <button
                type="button"
                className="mobile-btn-outline mobile-btn-outline--nav"
                onClick={openAdd}
              >
                <span>+ Shto vendndodhje</span>
              </button>
            </div>
          </div>
        )

      case 'detail': {
        const location = lokacionet.find((loc) => loc.id === screen.location.id) ?? screen.location
        const draft = detailDraft?.id === location.id
          ? detailDraft
          : { id: location.id, emri: location.emri, emoji: locationDisplayEmoji(location.flag_emoji) }
        const editing = detailEditingId === location.id
        return (
          <div className="mobile-settings-content">
            <div className="mobile-list-stack">
              <div>
                <span className="mobile-section-label">Emri</span>
                <div className="mobile-location-name-row">
                  <LocationEmojiPicker
                    value={draft.emoji}
                    onChange={(emoji) =>
                      setDetailDraft((prev) =>
                        prev?.id === location.id
                          ? { ...prev, emoji }
                          : { id: location.id, emri: draft.emri, emoji },
                      )
                    }
                    disabled={!editing || savingId === location.id}
                  />
                  <input
                    className="mobile-input"
                    value={draft.emri}
                    maxLength={40}
                    disabled={!editing || savingId === location.id}
                    onChange={(e) =>
                      setDetailDraft((prev) =>
                        prev?.id === location.id
                          ? { ...prev, emri: e.target.value }
                          : { id: location.id, emri: e.target.value, emoji: draft.emoji },
                      )
                    }
                  />
                </div>
              </div>
              <SheetFooterRow className="mobile-sheet-footer-row--compact">
                <button
                  type="button"
                  className={`mobile-sheet-btn ${
                    location.aktiv ? 'mobile-sheet-btn-cancel' : 'mobile-sheet-btn-primary'
                  }`}
                  disabled={editing || savingId === location.id}
                  onClick={() =>
                    void patchLocation(location.id, { aktiv: !location.aktiv }).then((ok) => {
                      if (!ok) return
                      props.onNotify(
                        location.aktiv
                          ? 'Vendndodhja u çaktivizua.'
                          : 'Vendndodhja u riaktivizua.',
                        'success',
                      )
                      pop()
                    })
                  }
                >
                  {location.aktiv ? <PowerOffIcon size={20} /> : <PowerOnIcon size={20} />}
                  <span>{location.aktiv ? 'Çaktivizo' : 'Riaktivizo'}</span>
                </button>
                <button
                  type="button"
                  className="mobile-sheet-btn mobile-sheet-btn-danger"
                  disabled={editing || savingId === location.id}
                  onClick={() => push({ type: 'delete', location })}
                >
                  <DeleteIcon />
                  <span>Fshi</span>
                </button>
                {editing ? (
                  <button
                    type="button"
                    className="mobile-sheet-btn mobile-sheet-btn-success"
                    disabled={savingId === location.id}
                    onClick={() => void saveAndExitDetailEdit()}
                  >
                    <CheckIcon />
                    <span>Ruaj</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mobile-sheet-btn mobile-sheet-btn-secondary"
                    disabled={savingId === location.id}
                    onClick={() => setDetailEditingId(location.id)}
                  >
                    <EditIcon />
                    <span>Ndrysho</span>
                  </button>
                )}
              </SheetFooterRow>
            </div>
          </div>
        )
      }

      case 'delete':
        return (
          <div className="mobile-settings-content">
            <p className="mobile-card-meta">
              Vendndodhja &quot;
              {locationDisplayEmoji(screen.location.flag_emoji ?? DEFAULT_LOCATION_EMOJI)}{' '}
              {screen.location.emri}&quot; do të fshihet dhe nuk do të mund të përdoret pas këtij momenti te inventari. Ky veprim është i pakthyeshëm.
            </p>
          </div>
        )

      case 'add':
        return (
          <div className="mobile-settings-content">
            <form
              id={LOCATION_ADD_FORM_ID}
              className="mobile-list-stack"
              onSubmit={(e) => void submitAdd(e)}
            >
              <div>
                <label className="mobile-section-label" htmlFor="mobile-location-add-emri">
                  Emri
                </label>
                <div className="mobile-location-name-row">
                  <LocationEmojiPicker
                    value={addEmoji}
                    onChange={setAddEmoji}
                    disabled={addSaving}
                  />
                  <input
                    id="mobile-location-add-emri"
                    className="mobile-input"
                    value={addEmri}
                    maxLength={40}
                    placeholder="Emri i vendndodhjes"
                    disabled={addSaving}
                    onChange={(e) => setAddEmri(e.target.value)}
                  />
                </div>
              </div>
              {addError ? <div className="mobile-inline-error">{addError}</div> : null}
            </form>
          </div>
        )

      default:
        return null
    }
  }

  if (!isAdmin(user)) {
    return (
      <div className="mobile-settings-content">
        <p className="mobile-card-meta">Vetëm administratorët mund të menaxhojnë vendndodhjet.</p>
      </div>
    )
  }

  return (
    <SheetNav
      index={nav.index}
      panelCount={panelCount}
      panelWidth={panelWidth}
      ready={nav.ready}
      dragging={nav.dragging}
      transitionLocked={transitionLocked}
      animating={animating}
      trackStyle={trackStyle}
      registerTrack={nav.registerTrack}
      canPop={canPop}
      onPop={pop}
      onPointerDown={(e) => nav.onPointerDown(e, canPop)}
      onPointerMove={nav.onPointerMove}
      onPointerUp={() => nav.finishDrag(canPop, pop)}
    >
      {screens.map((screen) => (
        <React.Fragment key={locationsScreenKey(screen)}>{renderScreen(screen)}</React.Fragment>
      ))}
    </SheetNav>
  )
}
