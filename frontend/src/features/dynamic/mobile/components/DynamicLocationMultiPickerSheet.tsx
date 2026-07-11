import * as React from 'react'
import { BottomSheet } from '../../../../mobile/components/BottomSheet'
import { SheetActionFooter } from '../../../../mobile/components/SheetActions'
import { ALL_LOKACIONET_LABEL } from '../../../../mobile/constants/historiFilters'
import {
  normalizeHistoriLocationIds,
  toggleHistoriLocationId,
} from '../../../../lib/historiFilterSelection'
import { locationBadge, useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { LocationAddModal } from '../../../locations/LocationAddModal'

export function DynamicLocationMultiPickerSheet(props: {
  open: boolean
  title: string
  selectedIds: string[]
  onApply: (ids: string[]) => void
  onClose: () => void
  allowAdd?: boolean
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const { activeLokacionet } = useLokacioni()
  const [addOpen, setAddOpen] = React.useState(false)
  const [draftIds, setDraftIds] = React.useState<string[]>(props.selectedIds)
  const allLocationIds = activeLokacionet.map((loc) => loc.id)

  React.useEffect(() => {
    if (props.open) setDraftIds(props.selectedIds)
  }, [props.open, props.selectedIds])

  const allSelected = draftIds.length === 0

  const applyDraft = () => {
    props.onApply(normalizeHistoriLocationIds(draftIds, allLocationIds))
    props.onClose()
  }

  return (
    <>
      <BottomSheet
        open={props.open}
        title={props.title}
        onClose={props.onClose}
        footer={
          <SheetActionFooter
            confirmLabel="Apliko"
            confirmIcon="check"
            onCancel={props.onClose}
            onConfirm={applyDraft}
          />
        }
      >
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
            <button
              type="button"
              className="mobile-btn-outline"
              onClick={() => {
                props.onClose()
                setAddOpen(true)
              }}
            >
              + Shto vendndodhje
            </button>
          ) : null}
        </div>
      </BottomSheet>

      {props.allowAdd ? (
        <LocationAddModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={(loc) => {
            setAddOpen(false)
            const next = normalizeHistoriLocationIds(
              draftIds.includes(loc.id) ? draftIds : [...draftIds, loc.id],
              [...allLocationIds, loc.id],
            )
            props.onApply(next)
            props.onNotify?.('Vendndodhja u shtua me sukses.', 'success')
          }}
        />
      ) : null}
    </>
  )
}
