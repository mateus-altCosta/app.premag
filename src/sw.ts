/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') || url.pathname === '/health',
  new NetworkOnly(),
)

try {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('/index.html'), {
      denylist: [/^\/api\//],
    }),
  )
} catch {
  /* sem precache no primeiro build */
}

self.addEventListener('push', (event) => {
  let titulo = 'PREMAG'
  let corpo = 'Há um alerta no turno.'
  let url = '/alertas'
  try {
    const data = event.data?.json() as { title?: string; body?: string; url?: string } | undefined
    if (data?.title) titulo = data.title
    if (data?.body) corpo = data.body
    if (data?.url) url = data.url
  } catch {
    const txt = event.data?.text()
    if (txt) corpo = txt
  }
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const alvo = (event.notification.data as { url?: string } | undefined)?.url ?? '/alertas'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const c of janelas) {
        if ('focus' in c) {
          void c.navigate(alvo)
          return c.focus()
        }
      }
      return self.clients.openWindow(alvo)
    }),
  )
})
