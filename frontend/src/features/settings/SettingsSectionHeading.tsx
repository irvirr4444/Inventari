export function SettingsSectionHeading(props: {
  as?: 'h1' | 'h3'
  label: string
  count: number
}) {
  const Tag = props.as ?? 'h3'

  return (
    <Tag className="settings-section-heading">
      <span className="settings-section-heading-label">{props.label}</span>
      <span className="settings-section-heading-sep" aria-hidden="true">
        |
      </span>
      <span className="settings-section-heading-meta">{props.count} gjithsej</span>
    </Tag>
  )
}
