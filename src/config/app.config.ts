export const appConfig = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
}

export function getApiClientBaseUrl(apiUrl: string): string {
  return apiUrl.replace(/\/$/, '')
}

/** Health da API fica na raiz (/health), não em /api/health. */
export function getHealthUrl(apiUrl: string): string {
  const base = getApiClientBaseUrl(apiUrl)
  if (/^https?:\/\//i.test(base))
    return `${base.replace(/\/api$/i, '')}/health`
  return '/health'
}
