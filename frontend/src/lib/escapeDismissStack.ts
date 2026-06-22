type Entry = {
  id: number
  onDismiss: () => void
  isDisabled: () => boolean
}

let stack: Entry[] = []
let nextId = 0
let listening = false

function onKeyDown(e: KeyboardEvent) {
  if (e.defaultPrevented || e.key !== 'Escape' || stack.length === 0) return

  const top = stack[stack.length - 1]
  if (top.isDisabled()) return

  e.preventDefault()
  top.onDismiss()
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

export function pushEscapeDismissLayer(
  onDismiss: () => void,
  isDisabled: () => boolean,
): () => void {
  ensureListening()
  const id = ++nextId
  const entry: Entry = { id, onDismiss, isDisabled }
  stack.push(entry)
  return () => {
    stack = stack.filter((e) => e.id !== id)
    stopListeningIfEmpty()
  }
}
