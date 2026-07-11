import type { LokacioniAkses } from '@inventari/shared'
import type { CSSProperties } from 'react'

type AccessValue = LokacioniAkses | ''

const ACCESS_LEVELS: Array<{
  value: AccessValue
  label: string
  shortLabel: string
  description: string
}> = [
  {
    value: '',
    label: 'Pa akses',
    shortLabel: 'Pa akses',
    description: 'Nuk mund ta shohë këtë vendndodhje.',
  },
  {
    value: 'view',
    label: 'Vetëm shih',
    shortLabel: 'Vetëm shih',
    description: 'Mund ta shohë, pa krijuar veprime apo transferta.',
  },
  {
    value: 'add',
    label: 'Shih dhe shto',
    shortLabel: 'Shih dhe shto',
    description: 'Mund të shohë dhe të shtojë veprime/transferta.',
  },
  {
    value: 'edit_delete',
    label: 'Shto dhe ndrysho/fshij',
    shortLabel: 'Shto dhe ndrysho/fshij',
    description: 'Mund të shtojë, ndryshojë dhe fshijë veprime.',
  },
]

function valueIndex(value: AccessValue): number {
  return ACCESS_LEVELS.findIndex((level) => level.value === value)
}

export function AccessLevelControl(props: {
  value: AccessValue
  onChange: (value: AccessValue) => void
  label?: string
  size?: 'sm' | 'md'
  savedValue?: AccessValue
}) {
  const activeIndex = Math.max(0, valueIndex(props.value))
  const savedIndex = props.savedValue === undefined ? -1 : Math.max(0, valueIndex(props.savedValue))
  const hasSavedChange = props.savedValue !== undefined && props.savedValue !== props.value
  const hasSavedValue = props.savedValue !== undefined && savedIndex >= 0
  const size = props.size ?? 'md'
  const currentDescription =
    ACCESS_LEVELS[activeIndex]?.description ?? ACCESS_LEVELS[0].description
  const setByIndex = (index: number) => {
    const safeIndex = Math.min(Math.max(index, 0), ACCESS_LEVELS.length - 1)
    props.onChange(ACCESS_LEVELS[safeIndex].value)
  }

  return (
    <div className={`access-level-control access-level-control-${size}`}>
      {props.label ? <span className="access-level-label">{props.label}</span> : null}
      <div
        className="access-level-segments"
        role="radiogroup"
        aria-label={props.label ?? 'Akses'}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault()
            setByIndex(activeIndex + 1)
          }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault()
            setByIndex(activeIndex - 1)
          }
          if (e.key === 'Home') {
            e.preventDefault()
            setByIndex(0)
          }
          if (e.key === 'End') {
            e.preventDefault()
            setByIndex(ACCESS_LEVELS.length - 1)
          }
        }}
        style={{ '--access-level': activeIndex } as CSSProperties}
      >
        {ACCESS_LEVELS.map((level, index) => {
          const selected = index === activeIndex
          const saved = hasSavedChange && hasSavedValue && index === savedIndex
          return (
            <button
              key={level.value || 'none'}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              className={`access-level-segment${selected ? ' is-selected' : ''}${
                saved ? ' is-saved' : ''
              }`}
              onClick={() => props.onChange(level.value)}
            >
              <span className="access-level-segment-label">{level.shortLabel}</span>
            </button>
          )
        })}
      </div>
      <span className="access-level-current" title={currentDescription}>
        {currentDescription}
      </span>
    </div>
  )
}
