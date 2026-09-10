const AUTH_KEY = 'premag_auth'
const DEVICE_KEY = 'premag_dispositivo'

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiraEm: string
  perfil: string
  equipeId?: string | null
  nome: string
}

export function getDispositivoId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export function loadSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession | null): void {
  if (!session) localStorage.removeItem(AUTH_KEY)
  else localStorage.setItem(AUTH_KEY, JSON.stringify(session))
}

export function isLoggedIn(): boolean {
  return !!loadSession()?.accessToken
}
