type Entry = {
  id: number
  onConfirm: () => void
  isDisabled: () => boolean
}

let stack: Entry[] = []
let nextId = 0
let listening = false

function shouldSkipEnterConfirm(e: KeyboardEvent): boolean {
  const target = e.target
  if (!(target instanceof HTMLElement)) return false
  // Shift+Enter keeps a newline in multiline fields; plain Enter confirms the popup.
  if (e.shiftKey && (target.tagName === 'TEXTAREA' || target.isContentEditable)) return true
  return false
}

function onKeyDown(e: KeyboardEvent) {
  if (e.defaultPrevented || e.key !== 'Enter' || stack.length === 0) return
  if (shouldSkipEnterConfirm(e)) return

  const top = stack[stack.length - 1]
  if (top.isDisabled()) return

  e.preventDefault()
  top.onConfirm()
}

function ensureListening() {
  if (listening || typeof document === 'undefined') return
  document.addEventListener('keydown', onKeyDown, true)
  listening = true
}

function stopListeningIfEmpty() {
  if (stack.length === 0 && listening && typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeyDown, true)
    listening = false
  }
}

export function pushEnterConfirmLayer(
  onConfirm: () => void,
  isDisabled: () => boolean,
): () => void {
  ensureListening()
  const id = ++nextId
  const entry: Entry = { id, onConfirm, isDisabled }
  stack.push(entry)
  return () => {
    stack = stack.filter((e) => e.id !== id)
    stopListeningIfEmpty()
  }
}
