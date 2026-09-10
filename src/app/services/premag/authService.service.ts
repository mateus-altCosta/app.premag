import { api } from './api.service'
import type { AuthTokenPairDto } from '../../models/entity'
import { getDispositivoId, loadSession, saveSession, type AuthSession } from './session'

export interface UsuarioAtual {
  id: string
  userName: string
  nome: string
  email?: string | null
  perfil: string
  tenantId: string
  equipeId?: string | null
  colaboradorId?: string | null
  permissoes: string[]
}

function toSession(data: AuthTokenPairDto): AuthSession {
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiraEm: data.expiraEm,
    perfil: data.perfil,
    equipeId: data.equipeId,
    nome: data.nome,
  }
}

export const authService = {
  async login(usuario: string, senha: string): Promise<AuthSession> {
    const response = await api.post<AuthTokenPairDto>('/auth/login', {
      usuario,
      senha,
      dispositivoId: getDispositivoId(),
    })
    const session = toSession(response.data)
    saveSession(session)
    return session
  },

  async me(): Promise<UsuarioAtual> {
    const response = await api.get<UsuarioAtual>('/auth/me')
    return response.data
  },

  async logout(): Promise<void> {
    const session = loadSession()
    try {
      await api.post('/auth/logout', {
        refreshToken: session?.refreshToken,
        dispositivoId: getDispositivoId(),
      })
    } catch {
      /* encerra local mesmo se a API falhar */
    }
    saveSession(null)
  },
}
