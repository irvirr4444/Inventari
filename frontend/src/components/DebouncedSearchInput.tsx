import * as React from 'react'
import { InputClearButton } from './InputClearButton'

/** Wait for a pause in typing before applying text search filters. */
export const SEARCH_FILTER_DEBOUNCE_MS = 1000

export function DebouncedSearchInput(props: {
  value: string
  onChange: (trimmedValue: string) => void
  debounceMs?: number
  className?: string
  placeholder?: string
  clearable?: boolean
}) {
  const { value, onChange, debounceMs = SEARCH_FILTER_DEBOUNCE_MS, className, placeholder, clearable } =
    props
  const [draft, setDraft] = React.useState(value)
  const [showProgress, setShowProgress] = React.useState(false)
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange
  const isPending = draft.trim() !== value.trim()
  const hasDraft = draft.trim() !== ''
  const silenceMs = debounceMs / 2
  const progressMs = debounceMs / 2

  React.useEffect(() => {
    setDraft(value)
  }, [value])

  React.useEffect(() => {
    const trimmedDraft = draft.trim()
    const trimmedValue = value.trim()
    if (trimmedDraft === trimmedValue) {
      setShowProgress(false)
      return
    }

    setShowProgress(false)

    const progressTimer = window.setTimeout(() => {
      setShowProgress(true)
    }, silenceMs)

    const commitTimer = window.setTimeout(() => {
      onChangeRef.current(trimmedDraft)
      setShowProgress(false)
    }, debounceMs)

    return () => {
      clearTimeout(progressTimer)
      clearTimeout(commitTimer)
    }
  }, [draft, value, debounceMs, silenceMs])

  const handleClear = () => {
    setDraft('')
    setShowProgress(false)
    onChangeRef.current('')
  }

  return (
    <span
      className={[
        'debounced-search-input',
        showProgress ? 'debounced-search-input--pending' : '',
        clearable ? 'debounced-search-input--clearable' : '',
        clearable && hasDraft ? 'debounced-search-input--has-value' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        type="text"
        className={className ? `${className} debounced-search-input__field` : 'debounced-search-input__field'}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        aria-busy={isPending}
      />
      {clearable ? (
        <InputClearButton className="debounced-search-input__clear" onClick={handleClear} />
      ) : null}
      {showProgress ? (
        <span
          className="debounced-search-input__progress"
          style={{ animationDuration: `${progressMs}ms` }}
          aria-hidden="true"
        />
      ) : null}
    </span>
  )
}
