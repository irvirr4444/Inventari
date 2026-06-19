import type { Lokacioni } from '../../lib/lokacioni/types'
import { locationBadge, useLokacioni } from '../../lib/lokacioni/LokacioniProvider'

export function LocationPicker(props: {
  value: string
  onChange: (id: string) => void
  excludeIds?: string[]
}) {
  const { activeLokacionet } = useLokacioni()
  const options = activeLokacionet.filter((l) => !props.excludeIds?.includes(l.id))

  if (options.length <= 4) {
    return (
      <div className="location-pill-row">
        {options.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`btn location-pill${props.value === l.id ? ' active' : ''}`}
            onClick={() => props.onChange(l.id)}
          >
            {locationBadge(l)} {l.emri}
          </button>
        ))}
      </div>
    )
  }

  return (
    <select
      className="input"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    >
      {options.map((l) => (
        <option key={l.id} value={l.id}>
          {l.emri}
        </option>
      ))}
    </select>
  )
}

export function LocationLabel(props: { lokacioni: Lokacioni }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span>{locationBadge(props.lokacioni)}</span>
      <span>{props.lokacioni.emri}</span>
    </span>
  )
}
