import { formatActionDateTime, formatDisplayTime } from '../../lib/actionMeta'

export function ActionMetaDisplay(props: {
  data?: string
  ora?: string | null
  pershkrimi?: string | null
  className?: string
  showDate?: boolean
}) {
  const time = formatDisplayTime(props.ora)
  const description = props.pershkrimi?.trim() ?? ''
  const showDate = props.showDate !== false && props.data

  if (!time && !description && !showDate) return null

  return (
    <div className={props.className ? `action-meta-display ${props.className}` : 'action-meta-display'}>
      {showDate ? (
        <span className="action-meta-display-when muted">
          {formatActionDateTime(props.data!, props.ora)}
        </span>
      ) : time ? (
        <span className="action-meta-display-when muted">Ora: {time}</span>
      ) : null}
      {description ? (
        <span className="action-meta-display-desc" title={description}>
          {description}
        </span>
      ) : null}
    </div>
  )
}

export function ActionMetaInline(props: {
  data: string
  ora?: string | null
  pershkrimi?: string | null
}) {
  const time = formatDisplayTime(props.ora)
  const description = props.pershkrimi?.trim() ?? ''
  if (!time && !description) return null

  return (
    <span className="action-meta-inline muted">
      {time ? <span>{formatActionDateTime(props.data, props.ora)}</span> : null}
      {description ? (
        <span className="action-meta-inline-desc" title={description}>
          {description}
        </span>
      ) : null}
    </span>
  )
}
