import { BottomSheet } from '../../../../mobile/components/BottomSheet'
import { ALL_LOKACIONET_LABEL } from '../../../../mobile/constants/historiFilters'
import { locationBadge, useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'

export function DynamicLocationMultiPickerSheet(props: {
  open: boolean
  title: string
  selectedIds: string[]
  onToggle: (id: string) => void
  onClearAll: () => void
  onClose: () => void
}) {
  const { activeLokacionet } = useLokacioni()
  const allSelected = props.selectedIds.length === 0

  return (
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
              <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                {locationBadge(loc)}
                {loc.emri}
                {checked ? <span className="mobile-card-meta">✓</span> : null}
              </span>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
