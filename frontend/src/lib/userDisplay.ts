export function userDisplayName(emri: string | null | undefined, email: string | null | undefined): string {
  return emri?.trim() || email?.trim() || 'Përdorues'
}

export function userInitials(emri: string | null | undefined, email: string | null | undefined): string {
  const name = userDisplayName(emri, email)
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0]![0] ?? ''}${words[1]![0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
