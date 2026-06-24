import * as React from 'react'
import { BottomSheet } from '../../../../mobile/components/BottomSheet'
import { locationBadge, useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { LocationAddModal } from '../../../locations/LocationAddModal'

export function DynamicLocationPickerSheet(props: {
  open: boolean
  title: string
  value: string
  onSelect: (id: string) => void
  onClose: () => void
  excludeIds?: string[]
  allowAdd?: boolean
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const { activeLokacionet } = useLokacioni()
  const [addOpen, setAddOpen] = React.useState(false)

  const excludedIds = new Set(props.excludeIds ?? [])
  const locations = activeLokacionet.filter(
    (l) => l.id === props.value || !excludedIds.has(l.id),
  )

  return (
    <>
      <BottomSheet open={props.open} title={props.title} onClose={props.onClose}>
        <div className="mobile-list-stack">
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              className={`mobile-tap-field${props.value === loc.id ? ' selected' : ''}`}
              onClick={() => {
                props.onSelect(loc.id)
                props.onClose()
              }}
            >
              <span className="mobile-location-option">
                <span className="mobile-location-option-emoji" aria-hidden="true">
                  {locationBadge(loc)}
                </span>
                <span className="mobile-location-option-name">{loc.emri}</span>
              </span>
            </button>
          ))}
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
            props.onSelect(loc.id)
            props.onClose()
            props.onNotify?.('Lokacioni u shtua me sukses.', 'success')
          }}
        />
      ) : null}
    </>
  )
}

export function DynamicLocationField(props: {
  label: string
  value: string
  onOpen: () => void
  locations: Array<{ id: string; emri: string; flag_emoji?: string | null }>
}) {
  const loc = props.locations.find((l) => l.id === props.value)

  return (
    <div>
      <label className="mobile-label">{props.label}</label>
      <button type="button" className="mobile-tap-field" onClick={props.onOpen}>
        <span className="mobile-location-option mobile-tap-field-value">
          {loc ? (
            <>
              <span className="mobile-location-option-emoji" aria-hidden="true">
                {loc.flag_emoji ?? '📍'}
              </span>
              <span className="mobile-location-option-name mobile-meta-truncate">{loc.emri}</span>
            </>
          ) : (
            <span className="mobile-location-option-name mobile-meta-truncate">Zgjedh lokacionin…</span>
          )}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
    </div>
  )
}
