import axios, { isAxiosError } from 'axios'
import { appConfig, getApiClientBaseUrl } from '../../../config/app.config'
import { getDispositivoId, loadSession, saveSession } from './session'
import { isFalhaDeRede, marcarAlcanceApi } from './rede'

export const api = axios.create({
  baseURL: getApiClientBaseUrl(appConfig.apiUrl),
  headers: { 'Content-Type': 'application/json' },
})

const refreshHttp = axios.create({
  baseURL: getApiClientBaseUrl(appConfig.apiUrl),
  headers: { 'Content-Type': 'application/json' },
})

let refreshInFlight: Promise<string | null> | null = null

api.interceptors.request.use((config) => {
  const token = loadSession()?.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    marcarAlcanceApi(true)
    return response
  },
  async (error) => {
    if (isFalhaDeRede(error)) marcarAlcanceApi(false)

    const original = error.config as typeof error.config & { _retried?: boolean }
    if (!isAxiosError(error) || error.response?.status !== 401 || original._retried) {
      return Promise.reject(error)
    }

    const session = loadSession()
    if (!session?.refreshToken) return Promise.reject(error)

    original._retried = true
    const novo = await renovarToken(session.refreshToken)
    if (!novo) {
      saveSession(null)
      return Promise.reject(error)
    }

    original.headers = original.headers ?? {}
    original.headers.Authorization = `Bearer ${novo}`
    return api.request(original)
  },
)

async function renovarToken(refreshToken: string): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshHttp
      .post('/auth/refresh', {
        refreshToken,
        dispositivoId: getDispositivoId(),
      })
      .then((res) => {
        const data = res.data
        const atual = loadSession()
        saveSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiraEm: data.expiraEm,
          perfil: data.perfil ?? atual?.perfil ?? '',
          equipeId: data.equipeId ?? atual?.equipeId,
          nome: data.nome ?? atual?.nome ?? '',
        })
        return data.accessToken as string
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}
