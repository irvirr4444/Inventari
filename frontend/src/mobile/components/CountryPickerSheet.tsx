import { BottomSheet } from './BottomSheet'
import { COUNTRY_META, type Country } from '../../lib/country'
import { countryLabel } from '../../lib/format'

export function CountryPickerSheet(props: {
  open: boolean
  value: Country
  onClose: () => void
  onSelect: (country: Country) => void
  title?: string
  exclude?: Country
}) {
  const countries = (['XK', 'AL'] as Country[]).filter((c) => c !== props.exclude)

  return (
    <BottomSheet open={props.open} title={props.title ?? 'Zgjidh shtetin'} onClose={props.onClose}>
      <div className="mobile-list-stack">
        {countries.map((c) => {
          const meta = COUNTRY_META[c]
          return (
            <button
              key={c}
              type="button"
              className={`mobile-tap-field${props.value === c ? ' selected' : ''}`}
              onClick={() => {
                props.onSelect(c)
                props.onClose()
              }}
            >
              <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                <img className="flagIcon" src={meta.flagSrc} alt="" width={20} height={14} />
                {countryLabel(c)}
              </span>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
