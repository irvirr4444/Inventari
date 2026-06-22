import * as React from 'react'
import { CheckIcon, CloseIcon, DeleteIcon, EditIcon, PlusIcon } from '../../components/icons'
import { useEnterToConfirm } from '../../hooks/useEnterToConfirm'

type SheetButtonProps = {
  label: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
  form?: string
}

export function SheetFooterRow(props: { children: React.ReactNode }) {
  return <div className="mobile-sheet-footer-row">{props.children}</div>
}

export function SheetCancelButton(props: SheetButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      form={props.form}
      className="mobile-sheet-btn mobile-sheet-btn-cancel"
      disabled={props.disabled || props.loading}
      onClick={props.onClick}
    >
      <CloseIcon />
      <span>{props.loading ? 'Duke anuluar…' : props.label}</span>
    </button>
  )
}

export function SheetConfirmButton(
  props: SheetButtonProps & { variant?: 'primary' | 'danger'; icon?: 'check' | 'plus' | 'delete' },
) {
  const variant = props.variant ?? 'primary'
  const Icon =
    props.icon === 'plus' ? PlusIcon : props.icon === 'delete' ? DeleteIcon : CheckIcon

  return (
    <button
      type={props.type ?? 'button'}
      form={props.form}
      className={`mobile-sheet-btn mobile-sheet-btn-${variant}`}
      disabled={props.disabled || props.loading}
      onClick={props.onClick}
    >
      <Icon />
      <span>{props.label}</span>
    </button>
  )
}

export function SheetEditButton(props: SheetButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      className="mobile-sheet-btn mobile-sheet-btn-secondary"
      disabled={props.disabled || props.loading}
      onClick={props.onClick}
    >
      <EditIcon />
      <span>{props.label}</span>
    </button>
  )
}

export function SheetActionFooter(props: {
  cancelLabel?: string
  confirmLabel: string
  onCancel: () => void
  onConfirm?: () => void
  confirmLoading?: boolean
  confirmDisabled?: boolean
  confirmVariant?: 'primary' | 'danger'
  confirmIcon?: 'check' | 'plus' | 'delete'
  confirmType?: 'button' | 'submit'
  form?: string
}) {
  useEnterToConfirm(() => props.onConfirm?.(), {
    enabled: Boolean(props.onConfirm),
    disabled: props.confirmDisabled || props.confirmLoading,
  })

  return (
    <SheetFooterRow>
      <SheetCancelButton label={props.cancelLabel ?? 'Anulo'} onClick={props.onCancel} />
      <SheetConfirmButton
        label={props.confirmLabel}
        onClick={props.onConfirm}
        loading={props.confirmLoading}
        disabled={props.confirmDisabled}
        variant={props.confirmVariant ?? 'primary'}
        icon={props.confirmIcon ?? 'check'}
        type={props.confirmType}
        form={props.form}
      />
    </SheetFooterRow>
  )
}
