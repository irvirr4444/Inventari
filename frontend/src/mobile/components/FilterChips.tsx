export type FilterChip = {
  id: string
  label: string
  value?: string
  active?: boolean
  indicator?: boolean
}

function FilterChevron() {
  return (
    <svg
      aria-hidden="true"
      className="mobile-filter-field-chevron"
      width="14"
      height="14"
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

function FilterFieldButton(props: {
  chip: FilterChip
  onSelect: (id: string) => void
}) {
  const { chip } = props
  return (
    <button
      type="button"
      className={`mobile-filter-field${chip.active ? ' is-active' : ''}${chip.indicator ? ' has-indicator' : ''}`}
      onClick={() => props.onSelect(chip.id)}
    >
      <span className="mobile-filter-field-main">
        <span className="mobile-filter-field-text">{chip.label}</span>
        <FilterChevron />
      </span>
      {chip.value ? <span className="mobile-filter-field-value">{chip.value}</span> : null}
    </button>
  )
}

export function FilterChips(props: {
  chips: FilterChip[]
  onSelect: (id: string) => void
}) {
  return (
    <div className="mobile-filter-bar" role="group" aria-label="Filtrat">
      {props.chips.map((chip) => (
        <FilterFieldButton key={chip.id} chip={chip} onSelect={props.onSelect} />
      ))}
    </div>
  )
}
