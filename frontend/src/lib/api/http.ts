const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const url = `${API_BASE}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    })
  } catch (err) {
    console.error('[inventari-api] fetch failed', url, err)
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError('Gabim ne lidhje me serverin. Kontrollo internetin.', 0)
  }

  if (!res.ok) {
    const text = await res.text()
    let message = text || `HTTP ${res.status}`
    try {
      const parsed = JSON.parse(text) as { error?: string }
      if (parsed.error) message = parsed.error
    } catch {
      /* plain text error body */
    }
    throw new ApiError(message, res.status)
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return (await res.json()) as T
  return (await res.text()) as T
}

export { API_BASE }
