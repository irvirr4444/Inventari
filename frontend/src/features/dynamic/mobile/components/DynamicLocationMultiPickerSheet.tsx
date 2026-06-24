import * as React from 'react'
import { BottomSheet } from '../../../../mobile/components/BottomSheet'
import { ALL_LOKACIONET_LABEL } from '../../../../mobile/constants/historiFilters'
import { locationBadge, useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { LocationAddModal } from '../../../locations/LocationAddModal'

export function DynamicLocationMultiPickerSheet(props: {
  open: boolean
  title: string
  selectedIds: string[]
  onToggle: (id: string) => void
  onClearAll: () => void
  onClose: () => void
  allowAdd?: boolean
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const { activeLokacionet } = useLokacioni()
  const [addOpen, setAddOpen] = React.useState(false)
  const allSelected = props.selectedIds.length === 0

  return (
    <>
      <BottomSheet open={props.open} title={props.title} onClose={props.onClose}>
        <div className="mobile-list-stack">
          <button
            type="button"
            className={`mobile-tap-field${allSelected ? ' selected' : ''}`}
            onClick={() => {
              props.onClearAll()
              props.onClose()
            }}
          >
            {ALL_LOKACIONET_LABEL}
          </button>
          {activeLokacionet.map((loc) => {
            const checked = props.selectedIds.includes(loc.id)
            return (
              <button
                key={loc.id}
                type="button"
                className={`mobile-tap-field${checked ? ' selected' : ''}`}
                onClick={() => props.onToggle(loc.id)}
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
              + Shto lokacion
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
            if (!props.selectedIds.includes(loc.id)) {
              props.onToggle(loc.id)
            }
            props.onNotify?.('Lokacioni u shtua me sukses.', 'success')
          }}
        />
      ) : null}
    </>
  )
}
