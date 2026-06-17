import type { Country } from '../lib/country'
import { countryLabel } from '../lib/format'

type CountrySelectProps = {
  value: Country
  onChange: (country: Country) => void
  disabledCountries?: Country[]
  className?: string
  id?: string
}

export function CountrySelect(props: CountrySelectProps) {
  const disabled = new Set(props.disabledCountries ?? [])
  return (
    <select
      className={props.className ?? 'select'}
      value={props.value}
      id={props.id}
      onChange={(e) => props.onChange(e.target.value as Country)}
    >
      {( ['XK', 'AL'] as Country[]).map((code) => (
        <option key={code} value={code} disabled={disabled.has(code)}>
          {countryLabel(code)}
        </option>
      ))}
    </select>
  )
}
