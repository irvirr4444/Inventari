import type * as React from 'react'

/**
 * Global hover tooltip wrapper. Renders a `data-tooltip` host so styles from
 * `styles/components/tooltip.css` apply anywhere in the app.
 *
 * Use directly on elements when hover works (e.g. buttons):
 * `<button data-tooltip="Label" className="hover-tooltip">…</button>`
 *
 * Wrap disabled controls (or children that block pointer events) with this
 * component so the tooltip still shows on hover.
 */
export function HoverTooltip(props: {
  label: string
  wrap?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={
        props.wrap
          ? `hover-tooltip hover-tooltip-wrap${props.className ? ` ${props.className}` : ''}`
          : `hover-tooltip${props.className ? ` ${props.className}` : ''}`
      }
      data-tooltip={props.label}
    >
      {props.children}
    </span>
  )
}

export function tooltipProps(label: string, options?: { wrap?: boolean; className?: string }) {
  const extra = options?.className ? ` ${options.className}` : ''
  return {
    'data-tooltip': label,
    className: options?.wrap ? `hover-tooltip hover-tooltip-wrap${extra}` : `hover-tooltip${extra}`,
  } as const
}
