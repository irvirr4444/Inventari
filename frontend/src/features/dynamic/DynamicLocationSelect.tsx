import { LocationPicker } from '../locations/LocationPicker'

export function DynamicLocationSelect(props: {
  value: string
  onChange: (id: string) => void
  excludeIds?: string[]
  allowAdd?: boolean
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
  dataTutorial?: string
}) {
  return (
    <LocationPicker
      value={props.value}
      onChange={props.onChange}
      excludeIds={props.excludeIds}
      allowAdd={props.allowAdd}
      onNotify={props.onNotify}
      dataTutorial={props.dataTutorial}
    />
  )
}
