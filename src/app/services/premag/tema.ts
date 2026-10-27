const KEY = 'premag-tema'

export type TemaPref = 'claro' | 'escuro' | 'sistema'

export function loadTemaPref(): TemaPref {
  const v = localStorage.getItem(KEY)
  if (v === 'claro' || v === 'escuro' || v === 'sistema') return v
  return 'sistema'
}

export function temaEfetivo(pref = loadTemaPref()): 'claro' | 'escuro' {
  if (pref === 'sistema') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
  }
  return pref
}

export function aplicarTema(pref?: TemaPref) {
  const efetivo = temaEfetivo(pref ?? loadTemaPref())
  document.documentElement.dataset.tema = efetivo
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', efetivo === 'escuro' ? '#12161c' : '#F4F6F8')
}

export function salvarTema(pref: TemaPref) {
  localStorage.setItem(KEY, pref)
  aplicarTema(pref)
}
