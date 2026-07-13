import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MobileSheetStack } from '../../../../mobile/components/MobileSheetStack'
import { SheetActionFooter } from '../../../../mobile/components/SheetActions'
import { useFloatingScreenStack } from '../../../../mobile/hooks/useScreenStack'
import { ALL_LOKACIONET_LABEL } from '../../../../mobile/constants/historiFilters'
import {
  normalizeHistoriLocationIds,
  toggleHistoriLocationId,
} from '../../../../lib/historiFilterSelection'
import { createLokacioni } from '../../../../lib/api/lokacionet'
import type { Lokacioni } from '../../../../lib/lokacioni/types'
import { locationBadge, useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { useAuth } from '../../../../lib/auth/AuthProvider'
import { queryKeys } from '../../../../lib/queryKeys'
import {
  DEFAULT_LOCATION_EMOJI,
  LocationEmojiPicker,
} from '../../../locations/LocationEmojiPicker'

const LOCATION_ADD_FORM_ID = 'dynamic-location-picker-add-form'

type LocationPickerScreen = { type: 'picker' } | { type: 'add' }

export function DynamicLocationMultiPickerSheet(props: {
  open: boolean
  title: string
  selectedIds: string[]
  onApply: (ids: string[]) => void
  onClose: () => void
  allowAdd?: boolean
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const { activeLokacionet, lokacionet, refresh } = useLokacioni()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const sheet = useFloatingScreenStack<LocationPickerScreen>()
  const [draftIds, setDraftIds] = React.useState<string[]>(props.selectedIds)
  const [addEmri, setAddEmri] = React.useState('')
  const [addEmoji, setAddEmoji] = React.useState(DEFAULT_LOCATION_EMOJI)
  const [addSaving, setAddSaving] = React.useState(false)
  const [addError, setAddError] = React.useState<string | null>(null)

  const allLocationIds = activeLokacionet.map((loc) => loc.id)

  React.useEffect(() => {
    if (props.open) setDraftIds(props.selectedIds)
  }, [props.open, props.selectedIds])

  React.useEffect(() => {
    if (!props.open) {
      sheet.close()
      return
    }
    sheet.push({ type: 'picker' })
  }, [props.open])

  const allSelected = draftIds.length === 0

  const applyDraft = () => {
    props.onApply(normalizeHistoriLocationIds(draftIds, allLocationIds))
    props.onClose()
  }

  const closeSheet = () => {
    sheet.close()
    props.onClose()
  }

  const openAdd = () => {
    setAddEmri('')
    setAddEmoji(DEFAULT_LOCATION_EMOJI)
    setAddError(null)
    sheet.push({ type: 'add' })
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
      const next = normalizeHistoriLocationIds(
        draftIds.includes(loc.id) ? draftIds : [...draftIds, loc.id],
        [...allLocationIds, loc.id],
      )
      props.onApply(next)
      props.onNotify?.('Vendndodhja u shtua me sukses.', 'success')
      closeSheet()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setAddSaving(false)
    }
  }

  const current = sheet.current
  let sheetTitle = props.title
  let sheetFooter: React.ReactNode = (
    <SheetActionFooter
      confirmLabel="Apliko"
      confirmIcon="check"
      onCancel={closeSheet}
      onConfirm={applyDraft}
    />
  )

  if (current?.type === 'add') {
    sheetTitle = 'Shto vendndodhje'
    sheetFooter = (
      <SheetActionFooter
        onCancel={sheet.pop}
        confirmLabel={addSaving ? 'Duke shtuar…' : 'Shto'}
        confirmLoading={addSaving}
        confirmDisabled={!addEmri.trim()}
        confirmType="submit"
        confirmIcon="plus"
        form={LOCATION_ADD_FORM_ID}
      />
    )
  }

  const renderScreen = (screen: LocationPickerScreen) => {
    if (screen.type === 'add') {
      return (
        <form
          id={LOCATION_ADD_FORM_ID}
          className="mobile-list-stack"
          onSubmit={(e) => void submitAdd(e)}
        >
          <div>
            <label className="mobile-section-label" htmlFor="dynamic-location-picker-add-emri">
              Emri
            </label>
            <div className="mobile-location-name-row">
              <LocationEmojiPicker value={addEmoji} onChange={setAddEmoji} disabled={addSaving} />
              <input
                id="dynamic-location-picker-add-emri"
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
      )
    }

    return (
      <div className="mobile-list-stack">
        <button
          type="button"
          className={`mobile-tap-field${allSelected ? ' selected' : ''}`}
          onClick={() => setDraftIds([])}
        >
          {ALL_LOKACIONET_LABEL}
        </button>
        {activeLokacionet.map((loc) => {
          const checked = draftIds.includes(loc.id)
          return (
            <button
              key={loc.id}
              type="button"
              className={`mobile-tap-field${checked ? ' selected' : ''}`}
              onClick={() =>
                setDraftIds((prev) => toggleHistoriLocationId(prev, loc.id, allLocationIds))
              }
            >
              <span className="mobile-location-option">
                <span className="mobile-location-option-emoji" aria-hidden="true">
                  {locationBadge(loc)}
                </span>
                <span className="mobile-location-option-name">{loc.emri}</span>
                {checked ? <span className="mobile-card-meta">✓</span> : null}
              </span>
            </button>
          )
        })}
        {props.allowAdd ? (
          <button type="button" className="mobile-btn-outline mobile-btn-outline--nav" onClick={openAdd}>
            <span>+ Shto vendndodhje</span>
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <MobileSheetStack
      open={props.open && sheet.open}
      nav={sheet.nav}
      panelCount={sheet.panelCount}
      panelWidth={sheet.panelWidth}
      trackStyle={sheet.trackStyle}
      transitionLocked={sheet.transitionLocked}
      animating={sheet.animating}
      canPop={sheet.canPop}
      onPop={sheet.pop}
      onClose={closeSheet}
      title={sheetTitle}
      footer={sheetFooter}
      className="mobile-sheet--chrome"
    >
      {sheet.screens.map((screen, index) => (
        <React.Fragment key={index}>{renderScreen(screen)}</React.Fragment>
      ))}
    </MobileSheetStack>
  )
}
