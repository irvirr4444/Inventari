import * as React from 'react'

export function ErrorAlert(props: { message: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: '12px 16px',
        background: 'var(--danger-bg)',
        borderRadius: 8,
        color: 'var(--danger)',
        fontSize: 14,
        ...props.style,
      }}
    >
      {props.message}
    </div>
  )
}
