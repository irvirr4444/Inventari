const MODAL_FIELD_SELECTOR = [
  'textarea:not([disabled]):not([readonly])',
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'select:not([disabled])',
  'button.date-input-trigger:not([disabled])',
  'button.time-input-trigger:not([disabled])',
  'input.product-search-input:not([disabled])',
].join(', ')

export function focusFirstModalField(container: HTMLElement | null) {
  if (!container) return

  const field = container.querySelector<HTMLElement>(MODAL_FIELD_SELECTOR)
  if (field) {
    field.focus()
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      field.select()
    }
    return
  }

  const confirmBtn = container.querySelector<HTMLElement>(
    '.confirm-modal-actions .btn.primary:not([disabled]), .confirm-modal-actions .btn.success:not([disabled]), .confirm-modal-actions .btn.danger:not([disabled])',
  )
  confirmBtn?.focus()
}
