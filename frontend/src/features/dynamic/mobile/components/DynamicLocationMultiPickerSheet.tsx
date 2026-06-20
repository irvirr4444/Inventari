import { BottomSheet } from '../../../../mobile/components/BottomSheet'
import { locationBadge, useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'

export function DynamicLocationMultiPickerSheet(props: {
  open: boolean
  title: string
  selectedIds: string[]
  onToggle: (id: string) => void
  onClose: () => void
}) {
  const { activeLokacionet } = useLokacioni()

  return (
    <BottomSheet open={props.open} title={props.title} onClose={props.onClose}>
      <div className="mobile-list-stack">
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
