import type { ActionBatch } from '../../lib/api'
import { LocationLabel } from '../locations/LocationPicker'
import { useLokacioni } from '../../lib/lokacioni/LokacioniProvider'

export function DynamicLocationCell(props: { action: ActionBatch }) {
  const { lokacionet } = useLokacioni()

  if (props.action.lloji === 'Transfer' && props.action.destination_lokacioni_id) {
    const from =
      lokacionet.find((l) => l.id === props.action.lokacioni_id) ??
      (props.action.lokacioni_emri
        ? {
            id: props.action.lokacioni_id ?? '',
            emri: props.action.lokacioni_emri,
            kodi: '',
            flag_emoji: props.action.flag_emoji ?? null,
            rradhitja: 0,
            show_in_summary: true,
            aktiv: true,
          }
        : null)
    const to =
      lokacionet.find((l) => l.id === props.action.destination_lokacioni_id) ??
      (props.action.destination_lokacioni_emri
        ? {
            id: props.action.destination_lokacioni_id ?? '',
            emri: props.action.destination_lokacioni_emri,
            kodi: '',
            flag_emoji: props.action.destination_flag_emoji ?? null,
            rradhitja: 0,
            show_in_summary: true,
            aktiv: true,
          }
        : null)

    if (from && to) {
      return (
        <span className="history-country history-country-transfer">
          <LocationLabel lokacioni={from} />
          <span className="history-country-route">→</span>
          <LocationLabel lokacioni={to} />
        </span>
      )
    }
  }

  const loc =
    lokacionet.find((l) => l.id === props.action.lokacioni_id) ??
    (props.action.lokacioni_emri
      ? {
          id: props.action.lokacioni_id ?? '',
          emri: props.action.lokacioni_emri,
          kodi: '',
          flag_emoji: props.action.flag_emoji ?? null,
          rradhitja: 0,
          show_in_summary: true,
          aktiv: true,
        }
      : null)

  if (!loc) return <span className="muted">—</span>

  return (
    <span className="history-country">
      <LocationLabel lokacioni={loc} />
    </span>
  )
}
