import { LocationsEditor } from '../../locations/LocationsEditor'

export function LocationsSettingsPanel(props: { embedded?: boolean }) {
  return (
    <div className={props.embedded ? 'settings-panel settings-panel-embedded' : undefined}>
      <LocationsEditor mode="settings" hideSummaryAndReorder={props.embedded} />
    </div>
  )
}
