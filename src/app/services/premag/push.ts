import { api } from './api.service'

function urlBase64ParaBytes(base64: string): Uint8Array {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(base64.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const saida = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) saida[i] = raw.charCodeAt(i)
  return saida
}

async function registroSw(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  return navigator.serviceWorker.ready
}

export async function ativarPush(): Promise<'ok' | 'sem-suporte' | 'negado' | 'desligado'> {
  const reg = await registroSw()
  if (!reg) return 'sem-suporte'
  if (Notification.permission === 'denied') return 'negado'
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission()
    if (p !== 'granted') return 'negado'
  }

  let chave: string
  try {
    const r = await api.get<{ chavePublica: string }>('/push/chave')
    chave = r.data.chavePublica
  } catch {
    return 'desligado'
  }
  if (!chave) return 'desligado'

  const atual = await reg.pushManager.getSubscription()
  const sub =
    atual ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ParaBytes(chave) as BufferSource,
    }))
  const json = sub.toJSON()
  await api.post('/push/inscrever', {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  })
  return 'ok'
}

export async function desligarPush(): Promise<void> {
  const reg = await registroSw()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    const json = sub.toJSON()
    try {
      await api.post('/push/desinscrever', { endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth })
    } catch {
      /* encerra local mesmo se a API falhar */
    }
    await sub.unsubscribe()
  }
}
