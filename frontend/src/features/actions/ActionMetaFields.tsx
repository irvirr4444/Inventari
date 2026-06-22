import { DateInput } from '../../components/DateInput'
import { InputClearButton } from '../../components/InputClearButton'
import { OraInput } from '../../components/OraInput'

function PershkrimiInput(props: {
  id: string
  className?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const hasValue = props.value.trim() !== ''
  return (
    <span className={`clearable-field${hasValue ? ' clearable-field--has-value' : ''}`}>
      <input
        id={props.id}
        type="text"
        className={props.className ? `clearable-field__control ${props.className}` : 'clearable-field__control input'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        maxLength={500}
        placeholder="Opsionale"
      />
      <InputClearButton
        className="clearable-field__clear"
        onClick={() => props.onChange('')}
      />
    </span>
  )
}

export function ActionMetaFields(props: {
  ora: string
  pershkrimi: string
  onOraChange: (value: string) => void
  onPershkrimiChange: (value: string) => void
  disabled?: boolean
  className?: string
  layout?: 'stacked' | 'inline' | 'modal-row'
  date?: string
  onDateChange?: (value: string) => void
}) {
  if (props.layout === 'inline') {
    return (
      <>
        <div className="action-header-control action-header-control-ora">
          <span className="muted action-header-control-label">Ora</span>
          <OraInput
            id="action-meta-ora"
            wrapperClassName="action-meta-ora-input"
            className="input"
            value={props.ora}
            onChange={props.onOraChange}
            disabled={props.disabled}
            clearable
            placeholder="Zgjedh orën"
          />
        </div>
        <div className="action-header-control action-header-control-pershkrimi">
          <span className="muted action-header-control-label">Pershkrimi</span>
          <PershkrimiInput
            id="action-meta-pershkrimi"
            className="input action-meta-pershkrimi-input"
            value={props.pershkrimi}
            onChange={props.onPershkrimiChange}
            disabled={props.disabled}
          />
        </div>
      </>
    )
  }

  if (props.layout === 'modal-row') {
    return (
      <div
        className={
          props.className
            ? `action-meta-fields action-meta-fields--modal-row ${props.className}`
            : 'action-meta-fields action-meta-fields--modal-row'
        }
      >
        <div className="action-meta-field action-meta-field-date">
          <label className="label" htmlFor="action-meta-date">
            Data
          </label>
          <DateInput
            value={props.date ?? ''}
            onChange={props.onDateChange ?? (() => {})}
            className="action-meta-date-input"
          />
        </div>
        <div className="action-meta-field action-meta-field-ora">
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
            clearable
          />
        </div>
        <div className="action-meta-field action-meta-field-pershkrimi">
          <label className="label" htmlFor="action-meta-pershkrimi">
            Pershkrimi
          </label>
          <PershkrimiInput
            id="action-meta-pershkrimi"
            className="input action-meta-pershkrimi-input"
            value={props.pershkrimi}
            onChange={props.onPershkrimiChange}
            disabled={props.disabled}
          />
        </div>
      </div>
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
          clearable
        />
      </div>
      <div className="action-meta-field action-meta-field-grow">
        <label className="label" htmlFor="action-meta-pershkrimi">
          Pershkrimi
        </label>
        <PershkrimiInput
          id="action-meta-pershkrimi"
          className="input"
          value={props.pershkrimi}
          onChange={props.onPershkrimiChange}
          disabled={props.disabled}
        />
      </div>
    </div>
  )
}
