import { TimePickerPopover } from '../../components/TimePickerPopover'
import { BottomSheet } from './BottomSheet'

export function TimePickerSheet(props: {
  open: boolean
  value: string
  title?: string
  rangeFrom?: string
  rangeTo?: string
  activeEndpoint?: 'from' | 'to'
  onClose: () => void
  onChange: (value: string) => boolean | void
}) {
  const handleConfirm = (next: string) => {
    if (props.onChange(next) === false) return
    props.onClose()
  }

  return (
    <BottomSheet open={props.open} title={props.title ?? 'Zgjedh orën'} onClose={props.onClose}>
      <TimePickerPopover
        key={props.value || '__empty__'}
        className="mobile-time-picker"
        value={props.value}
        previewLabel={props.title}
        rangeFrom={props.rangeFrom}
        rangeTo={props.rangeTo}
        activeEndpoint={props.activeEndpoint}
        onConfirm={handleConfirm}
        onClear={() => {
          handleConfirm('')
        }}
      />
    </BottomSheet>
  )
}
