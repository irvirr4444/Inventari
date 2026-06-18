import { BottomSheet } from './BottomSheet'
import { DatePickerCalendar } from '../../components/DatePickerCalendar'

export function DatePickerSheet(props: {
  open: boolean
  value: string
  title?: string
  onClose: () => void
  onSelect: (iso: string) => void
}) {
  return (
    <BottomSheet open={props.open} title={props.title ?? 'Zgjedh daten'} onClose={props.onClose}>
      <DatePickerCalendar
        className="mobile-date-picker-calendar"
        value={props.value}
        onChange={(iso) => {
          props.onSelect(iso)
          props.onClose()
        }}
      />
    </BottomSheet>
  )
}
