import { isAxiosError } from 'axios'
import { appConfig, getHealthUrl } from '../../../config/app.config'

const EVT_REDE = 'premag-rede'
const EVT_FILA = 'premag-fila'

let apiAlcance = true
let monitorLigado = false
let pingEmCurso: Promise<boolean> | null = null

export function isFalhaDeRede(err: unknown): boolean {
  if (!isAxiosError(err)) return false
  return !err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error'
}

export function marcarAlcanceApi(ok: boolean): void {
  if (apiAlcance === ok) return
  apiAlcance = ok
  window.dispatchEvent(new Event(EVT_REDE))
}

export function estaOnline(): boolean {
  return navigator.onLine && apiAlcance
}

async function pingApi(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = window.setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(getHealthUrl(appConfig.apiUrl), {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
    })
    window.clearTimeout(t)
    return res.ok
  } catch {
    return false
  }
}

/** Quando a rede volta, o navegador fica online mas a API ainda estava marcada como caída. */
export async function verificarAlcance(tentativas = 4): Promise<boolean> {
  if (!navigator.onLine) {
    marcarAlcanceApi(false)
    return false
  }
  if (pingEmCurso) return pingEmCurso

  pingEmCurso = (async () => {
    for (let i = 0; i < tentativas; i++) {
      if (!navigator.onLine) {
        marcarAlcanceApi(false)
        return false
      }
      if (await pingApi()) {
        marcarAlcanceApi(true)
        return true
      }
      await new Promise((r) => setTimeout(r, 350 * (i + 1)))
    }
    marcarAlcanceApi(false)
    return false
  })().finally(() => {
    pingEmCurso = null
  })

  return pingEmCurso
}

function ligarMonitor(): void {
  if (monitorLigado || typeof window === 'undefined') return
  monitorLigado = true

  window.addEventListener('offline', () => marcarAlcanceApi(false))
  window.addEventListener('online', () => {
    void verificarAlcance()
  })
  window.addEventListener('focus', () => {
    if (navigator.onLine && !apiAlcance) void verificarAlcance()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine && !apiAlcance) {
      void verificarAlcance()
    }
  })
  window.setInterval(() => {
    if (navigator.onLine && !apiAlcance) void verificarAlcance(1)
  }, 8000)
}

export function onRede(cb: () => void): () => void {
  ligarMonitor()
  const fire = () => cb()
  window.addEventListener('online', fire)
  window.addEventListener('offline', fire)
  window.addEventListener(EVT_REDE, fire)
  return () => {
    window.removeEventListener('online', fire)
    window.removeEventListener('offline', fire)
    window.removeEventListener(EVT_REDE, fire)
  }
}

export function avisarFila(): void {
  window.dispatchEvent(new Event(EVT_FILA))
}

export function onFila(cb: () => void): () => void {
  const fire = () => cb()
  window.addEventListener(EVT_FILA, fire)
  return () => window.removeEventListener(EVT_FILA, fire)
}
