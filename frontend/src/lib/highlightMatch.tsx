import * as React from 'react'

export function highlightMatch(text: string, term: string): React.ReactNode {
  const trimmed = term.trim()
  if (!trimmed) return text

  const lowerText = text.toLowerCase()
  const lowerTerm = trimmed.toLowerCase()
  const index = lowerText.indexOf(lowerTerm)
  if (index === -1) return text

  const before = text.slice(0, index)
  const match = text.slice(index, index + trimmed.length)
  const after = text.slice(index + trimmed.length)

  return (
    <>
      {before}
      <mark className="history-shenim-match">{match}</mark>
      {after}
    </>
  )
}

export function shenimContainsTerm(shenim: string | null | undefined, term: string): boolean {
  if (!shenim?.trim() || !term.trim()) return false
  return shenim.toLowerCase().includes(term.trim().toLowerCase())
}
