export type FilterChip = {
  id: string
  label: string
  active?: boolean
  indicator?: boolean
}

export function FilterChips(props: {
  chips: FilterChip[]
  onSelect: (id: string) => void
}) {
  return (
    <div className="mobile-filter-chips" role="group">
      {props.chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className={`mobile-chip${chip.active ? ' active' : ''}${chip.indicator ? ' has-indicator' : ''}`}
          onClick={() => props.onSelect(chip.id)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
