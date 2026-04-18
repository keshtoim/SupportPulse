const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:3000'

export function getToken(): string | null {
  return localStorage.getItem('sp_token')
}

export function setToken(token: string): void {
  localStorage.setItem('sp_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('sp_token')
  localStorage.removeItem('sp_user')
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw err
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const http = {
  get:   <T>(path: string)                => request<T>('GET',    path),
  post:  <T>(path: string, body: unknown) => request<T>('POST',   path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH',  path, body),
  put:   <T>(path: string, body: unknown) => request<T>('PUT',    path, body),
  del:   <T>(path: string)                => request<T>('DELETE', path),
}
