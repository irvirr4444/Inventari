const KODI_MAX_LEN = 8

export function deriveKodiBase(emri: string): string {
  const letters = emri.replace(/[^a-zA-ZÀ-ž]/gi, '').slice(0, 3).toUpperCase()
  return letters || 'LOC'
}

export function kodiCandidateForAttempt(base: string, attempt: number): string {
  if (attempt <= 1) return base.slice(0, KODI_MAX_LEN)
  const suffix = String(attempt)
  const prefix = base.slice(0, KODI_MAX_LEN - suffix.length)
  return (prefix + suffix).slice(0, KODI_MAX_LEN)
}

export function pickAvailableKodi(
  emri: string,
  takenKodis: Set<string>,
  excludeKodi?: string,
): string {
  const base = deriveKodiBase(emri)
  let attempt = 1
  while (attempt < 1000) {
    const candidate = kodiCandidateForAttempt(base, attempt)
    if (candidate === excludeKodi || !takenKodis.has(candidate)) {
      return candidate
    }
    attempt += 1
  }
  return kodiCandidateForAttempt(base, attempt)
}
