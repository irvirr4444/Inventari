import { TimePickerPopover } from '../../components/TimePickerPopover'
import { BottomSheet } from './BottomSheet'

export function TimePickerSheet(props: {
  open: boolean
  value: string
  title?: string
  onClose: () => void
  onChange: (value: string) => void
}) {
  return (
    <BottomSheet open={props.open} title={props.title ?? 'Zgjedh orën'} onClose={props.onClose}>
      <TimePickerPopover
        key={props.value || '__empty__'}
        className="mobile-time-picker"
        value={props.value}
        onConfirm={(next) => {
          props.onChange(next)
          props.onClose()
        }}
        onClear={() => {
          props.onChange('')
          props.onClose()
        }}
      />
    </BottomSheet>
  )
}
