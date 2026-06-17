export function productLabel(emri: string | null | undefined, kodi: string): string {
  const name = emri?.trim() ?? ''
  const code = kodi.trim()
  if (name && code) return `${name} (${code})`
  return name || code
}
