import * as React from 'react'
import { DEFAULT_LOCATION_EMOJI, LocationEmojiPicker } from '../../locations/LocationEmojiPicker'

export type LocationDraft = {
  emri: string
  flagEmoji: string
}

const PLACEHOLDERS = [
  'p.sh. Magazina Kryesore',
  'p.sh. Dyqani Qendër',
  'p.sh. Depo Veri',
]

export function createEmptyLocations(count: number): LocationDraft[] {
  return Array.from({ length: count }, () => ({
    emri: '',
    flagEmoji: DEFAULT_LOCATION_EMOJI,
  }))
}

export function Screen3LocationNames(props: {
  locations: LocationDraft[]
  onChange: (locations: LocationDraft[]) => void
  onContinue: () => void
}) {
  const [openPickerIndex, setOpenPickerIndex] = React.useState<number | null>(null)

  const allNamed = props.locations.every((l) => l.emri.trim().length > 0)
  const headline =
    props.locations.length === 1
      ? 'Shumë mirë. Si e quani vendodhjen tuaj?'
      : 'Shumë mirë. Le t\'i vendosim emra vendodhjeve tuaja.'

  const updateLocation = (index: number, patch: Partial<LocationDraft>) => {
    const next = props.locations.map((loc, i) => (i === index ? { ...loc, ...patch } : loc))
    props.onChange(next)
  }

  return (
    <div className="onboarding-wizard__screen">
      <h1 className="ob-headline">{headline}</h1>
      <div className="ob-location-name-list">
        {props.locations.map((loc, index) => (
          <div key={index} className="ob-location-name-row" style={{ flexWrap: 'wrap' }}>
            <span className="ob-location-name-row__index">{index + 1}.</span>
            <input
              className="ob-location-name-row__input"
              value={loc.emri}
              placeholder={PLACEHOLDERS[Math.min(index, PLACEHOLDERS.length - 1)]}
              onChange={(e) => updateLocation(index, { emri: e.target.value })}
              aria-label={`Emri i vendodhjes ${index + 1}`}
            />
            <button
              type="button"
              className={`ob-location-name-row__emoji${openPickerIndex === index ? ' ob-location-name-row__emoji--open' : ''}`}
              onClick={() => setOpenPickerIndex(openPickerIndex === index ? null : index)}
              aria-label="Zgjidh emoji"
            >
              {loc.flagEmoji}
            </button>
            {openPickerIndex === index ? (
              <LocationEmojiPicker
                className="ob-location-name-row__picker"
                value={loc.flagEmoji}
                onChange={(emoji) => {
                  updateLocation(index, { flagEmoji: emoji })
                  setOpenPickerIndex(null)
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="ob-cta-wrap">
        <button type="button" className="ob-cta" disabled={!allNamed} onClick={props.onContinue}>
          Vazhdo →
        </button>
      </div>
    </div>
  )
}
