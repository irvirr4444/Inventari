import { OraInput } from '../../components/OraInput'

export function ActionMetaFields(props: {
  ora: string
  pershkrimi: string
  onOraChange: (value: string) => void
  onPershkrimiChange: (value: string) => void
  disabled?: boolean
  className?: string
  layout?: 'stacked' | 'inline'
}) {
  if (props.layout === 'inline') {
    return (
      <>
        <div className="action-header-control action-header-control-ora">
          <span className="muted action-header-control-label">Ora</span>
          <OraInput
            id="action-meta-ora"
            variant="compact"
            wrapperClassName="action-meta-ora-input"
            value={props.ora}
            onChange={props.onOraChange}
            disabled={props.disabled}
          />
        </div>
        <div className="action-header-control action-header-control-pershkrimi">
          <span className="muted action-header-control-label">Pershkrimi</span>
          <input
            id="action-meta-pershkrimi"
            type="text"
            className="input action-meta-pershkrimi-input"
            value={props.pershkrimi}
            onChange={(e) => props.onPershkrimiChange(e.target.value)}
            disabled={props.disabled}
            maxLength={500}
            placeholder="Opsionale"
          />
        </div>
      </>
    )
  }

  return (
    <div className={props.className ? `action-meta-fields ${props.className}` : 'action-meta-fields'}>
      <div className="action-meta-field">
        <label className="label" htmlFor="action-meta-ora">
          Ora
        </label>
        <OraInput
          id="action-meta-ora"
          wrapperClassName="action-meta-ora-input"
          className="input"
          value={props.ora}
          onChange={props.onOraChange}
          disabled={props.disabled}
        />
      </div>
      <div className="action-meta-field action-meta-field-grow">
        <label className="label" htmlFor="action-meta-pershkrimi">
          Pershkrimi
        </label>
        <input
          id="action-meta-pershkrimi"
          type="text"
          className="input"
          value={props.pershkrimi}
          onChange={(e) => props.onPershkrimiChange(e.target.value)}
          disabled={props.disabled}
          maxLength={500}
          placeholder="Opsionale"
        />
      </div>
    </div>
  )
}
