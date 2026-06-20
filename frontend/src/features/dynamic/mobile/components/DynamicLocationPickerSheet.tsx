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

  const locations = activeLokacionet.filter((l) => !props.excludeIds?.includes(l.id))

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
              <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                {locationBadge(loc)}
                {loc.emri}
              </span>
            </button>
          ))}
          {props.allowAdd ? (
            <button type="button" className="mobile-btn-outline" onClick={() => setAddOpen(true)}>
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
        <span className="row mobile-tap-field-value" style={{ gap: 8, alignItems: 'center' }}>
          {loc ? (
            <>
              <span>{loc.flag_emoji ?? '📍'}</span>
              <span className="mobile-meta-truncate">{loc.emri}</span>
            </>
          ) : (
            <span className="mobile-meta-truncate">Zgjedh lokacionin…</span>
          )}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
    </div>
  )
}
