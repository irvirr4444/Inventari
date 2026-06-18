import * as React from 'react'
import { COUNTRY_META, type Country } from '../../lib/country'
import { countryLabel } from '../../lib/format'
import { CountryPickerSheet } from './CountryPickerSheet'

function FieldChevron() {
  return (
    <svg
      aria-hidden="true"
      className="mobile-field-chevron"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function MobileCountryField(props: {
  label: string
  value: Country
  onChange: (country: Country) => void
  disabled?: boolean
  exclude?: Country
  sheetTitle?: string
}) {
  const [open, setOpen] = React.useState(false)
  const meta = COUNTRY_META[props.value]

  return (
    <>
      <div>
        <label className="mobile-label">{props.label}</label>
        <button
          type="button"
          className="mobile-tap-field"
          disabled={props.disabled}
          onClick={() => setOpen(true)}
        >
          <span className="row" style={{ gap: 8, alignItems: 'center' }}>
            <img className="flagIcon" src={meta.flagSrc} alt="" width={20} height={14} />
            {countryLabel(props.value)}
          </span>
          <FieldChevron />
        </button>
      </div>

      <CountryPickerSheet
        open={open}
        value={props.value}
        title={props.sheetTitle}
        exclude={props.exclude}
        onClose={() => setOpen(false)}
        onSelect={props.onChange}
      />
    </>
  )
}
