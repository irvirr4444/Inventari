import * as React from 'react'
import { LocationEmojiPicker } from './LocationEmojiPicker'

type LocationCardProps = {
  emri: string
  flagEmoji: string
  onEmriChange?: (value: string) => void
  onEmriBlur?: (value: string) => void
  onEmojiChange?: (value: string) => void
  readOnly?: boolean
  actions?: React.ReactNode
  footer?: React.ReactNode
}

export function LocationCard(props: LocationCardProps) {
  const readOnly = props.readOnly ?? false
  const showEmojiPicker = !readOnly && props.onEmojiChange

  return (
    <div className="location-card card-inner">
      {showEmojiPicker ? (
        <LocationEmojiPicker
          value={props.flagEmoji}
          onChange={props.onEmojiChange!}
        />
      ) : (
        <div className="location-card-emoji-readonly" aria-hidden="true">
          {props.flagEmoji}
        </div>
      )}

      <div className="location-card-body">
        <div className="location-card-row">
          <div className="location-card-name">
            {readOnly ? (
              <span className="location-card-name-text">{props.emri}</span>
            ) : props.onEmriBlur && !props.onEmriChange ? (
              <input
                key={props.emri}
                className="input"
                defaultValue={props.emri}
                maxLength={40}
                placeholder="Emri i lokacionit"
                onBlur={(e) => props.onEmriBlur?.(e.target.value)}
              />
            ) : (
              <input
                className="input"
                value={props.emri}
                maxLength={40}
                placeholder="Emri i lokacionit"
                onChange={(e) => props.onEmriChange?.(e.target.value)}
                onBlur={(e) => props.onEmriBlur?.(e.target.value)}
              />
            )}
          </div>
          {props.actions ? <div className="location-card-actions">{props.actions}</div> : null}
        </div>
        {props.footer ? <div className="location-card-footer">{props.footer}</div> : null}
      </div>
    </div>
  )
}
