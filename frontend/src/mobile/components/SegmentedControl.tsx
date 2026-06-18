type SegmentedOption<T extends string> = {
  value: T
  label: string
  tone?: 'success' | 'danger'
}

export function SegmentedControl<T extends string>(props: {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div className="mobile-segmented" role="tablist">
      {props.options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={props.value === opt.value}
          className={`mobile-segmented-btn${props.value === opt.value ? ' active' : ''}${opt.tone && props.value === opt.value ? ` ${opt.tone}` : ''}`}
          onClick={() => props.onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
