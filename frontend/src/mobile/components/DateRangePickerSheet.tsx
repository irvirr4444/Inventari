import { BottomSheet } from './BottomSheet'
import { DatePickerCalendar } from '../../components/DatePickerCalendar'

export function DateRangePickerSheet(props: {
  open: boolean
  from: string
  to: string
  selectingEndpoint?: 'from' | 'to'
  title?: string
  clearable?: boolean
  onClose: () => void
  onRangeChange: (from: string, to: string) => void
}) {
  return (
    <BottomSheet
      open={props.open}
      title={props.title ?? 'Zgjedh periudhen'}
      onClose={props.onClose}
    >
      <DatePickerCalendar
        className="mobile-date-picker-calendar"
        clearable={props.clearable}
        rangeFrom={props.from}
        rangeTo={props.to}
        selectingEndpoint={props.selectingEndpoint}
        onRangeChange={props.onRangeChange}
        onRangeComplete={props.onClose}
      />
    </BottomSheet>
  )
}
