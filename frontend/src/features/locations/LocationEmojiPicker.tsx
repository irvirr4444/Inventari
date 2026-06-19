import * as React from 'react'
import { DEFAULT_LOCATION_EMOJI, SUGGESTED_LOCATION_EMOJIS } from './locationEmojis'

export { DEFAULT_LOCATION_EMOJI } from './locationEmojis'

export function LocationEmojiPicker(props: {
  value: string
  onChange: (emoji: string) => void
  disabled?: boolean
  className?: string
}) {
  const [selected, setSelected] = React.useState(props.value)

  React.useEffect(() => {
    setSelected(props.value)
  }, [props.value])

  const className = ['location-emoji-picker', props.className].filter(Boolean).join(' ')

  return (
    <div className={className} role="group" aria-label="Ikona e lokacionit">
      {SUGGESTED_LOCATION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={`location-emoji-option${selected === emoji ? ' active' : ''}`}
          disabled={props.disabled}
          aria-pressed={selected === emoji}
          aria-label={`Zgjidh ikonen ${emoji}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            if (props.disabled) return
            setSelected(emoji)
            props.onChange(emoji)
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

export function locationDisplayEmoji(flagEmoji: string | null | undefined): string {
  return flagEmoji?.trim() || DEFAULT_LOCATION_EMOJI
}
