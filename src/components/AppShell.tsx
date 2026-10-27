import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { authService, type UsuarioAtual } from '../app/services/premag/authService.service'
import { loadSession } from '../app/services/premag/session'
import { ehEncarregado, ehDiretoria, podeGerir } from '../app/services/premag/perfil'
import { contarFila, sincronizarFila } from '../app/services/premag/sync.service'
import { estaOnline, onFila, onRede, verificarAlcance } from '../app/services/premag/rede'
import { operacaoService } from '../app/services/premag/operacao.service'
import { ativarPush } from '../app/services/premag/push'
import { Marca } from './ui'

type AbaIcone = 'equipe' | 'obras' | 'diario' | 'alertas' | 'relatorios' | 'dia'

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return 'P'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function IconeAba({ tipo }: { tipo: AbaIcone }) {
  const props = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  if (tipo === 'equipe') {
    return (
      <svg {...props}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0112 0" />
        <path d="M16 6a3 3 0 010 6M18 20a6 6 0 00-2-4.5" />
      </svg>
    )
  }
  if (tipo === 'obras') {
    return (
      <svg {...props}>
        <path d="M3 20h18M6 20V9l6-4 6 4v11" />
        <path d="M10 20v-5h4v5" />
      </svg>
    )
  }
  if (tipo === 'diario') {
    return (
      <svg {...props}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    )
  }
  if (tipo === 'alertas') {
    return (
      <svg {...props}>
        <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
        <path d="M10 20h4" />
      </svg>
    )
  }
  if (tipo === 'dia') {
    return (
      <svg {...props}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 11h16" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  )
}

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = loadSession()
  const [me, setMe] = useState<UsuarioAtual | null>(null)
  const [online, setOnline] = useState(estaOnline())
  const [fila, setFila] = useState(0)
  const [alertas, setAlertas] = useState(0)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [instalarEv, setInstalarEv] = useState<{ prompt: () => Promise<void> } | null>(null)
  const [esconderInstalar, setEsconderInstalar] = useState(
    () => sessionStorage.getItem('premag-instalar') === '1' || window.matchMedia('(display-mode: standalone)').matches,
  )
  const perfil = me?.perfil ?? session?.perfil
  const encarregado = ehEncarregado(perfil)
  const gerir = podeGerir(perfil)
  const diretoria = ehDiretoria(perfil)
  const equipeHome = me?.equipeId ?? session?.equipeId
  const nome = me?.nome ?? session?.nome ?? '…'

  useEffect(() => {
    authService.me().then(setMe).catch(() => undefined)
    contarFila().then(setFila).catch(() => undefined)
    operacaoService.ocorrencias(true).then((l) => setAlertas(l.length)).catch(() => undefined)
    void ativarPush()
    const onInstalar = (e: Event) => {
      e.preventDefault()
      const ev = e as Event & { prompt: () => Promise<void> }
      setInstalarEv(ev)
    }
    window.addEventListener('beforeinstallprompt', onInstalar)
    const offF = onFila(() => contarFila().then(setFila).catch(() => undefined))
    const offR = onRede(() => {
      const ok = estaOnline()
      setOnline(ok)
      if (ok) sincronizarFila().catch(() => undefined)
    })
    verificarAlcance().catch(() => undefined)
    if (estaOnline()) sincronizarFila().catch(() => undefined)
    return () => {
      offF()
      offR()
      window.removeEventListener('beforeinstallprompt', onInstalar)
    }
  }, [])

  useEffect(() => {
    setMenu(false)
  }, [location.pathname])

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  async function sair() {
    await authService.logout()
    navigate('/login', { replace: true })
  }

  const abas: { to: string; label: string; icone: AbaIcone; match?: (p: string) => boolean }[] = encarregado
    ? [
        {
          to: equipeHome ? `/equipes/${equipeHome}` : '/equipes',
          label: 'Equipe',
          icone: 'equipe',
          match: (p) => p.startsWith('/equipes'),
        },
        { to: '/diario', label: 'Diário', icone: 'diario' },
        { to: '/fechamento', label: 'Dia', icone: 'dia' },
        { to: '/alertas', label: 'Alertas', icone: 'alertas' },
      ]
    : diretoria
      ? [
          { to: '/equipes', label: 'Equipes', icone: 'equipe', match: (p) => p.startsWith('/equipes') },
          { to: '/obras', label: 'Obras', icone: 'obras', match: (p) => p.startsWith('/obras') },
          { to: '/diario', label: 'Diário', icone: 'diario' },
          { to: '/relatorios', label: 'Relatórios', icone: 'relatorios' },
          { to: '/fechamento', label: 'Dia', icone: 'dia' },
        ]
      : gerir
        ? [
            { to: '/equipes', label: 'Equipes', icone: 'equipe', match: (p) => p.startsWith('/equipes') },
            { to: '/obras', label: 'Obras', icone: 'obras', match: (p) => p.startsWith('/obras') },
            { to: '/diario', label: 'Diário', icone: 'diario' },
            { to: '/relatorios', label: 'Relatórios', icone: 'relatorios' },
            { to: '/fechamento', label: 'Dia', icone: 'dia' },
          ]
        : [
            { to: '/equipes', label: 'Equipes', icone: 'equipe', match: (p) => p.startsWith('/equipes') },
            { to: '/obras', label: 'Obras', icone: 'obras', match: (p) => p.startsWith('/obras') },
          ]

  const path = location.pathname
  const abaAtiva = useMemo(
    () => abas.find((a) => (a.match ? a.match(path) : path === a.to || path.startsWith(`${a.to}/`))),
    [abas, path],
  )

  return (
    <div className="app-frame">
      <div className="app-shell">
        <header className="z-40 shrink-0 border-b border-white/5 bg-grafite px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] text-papel">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Marca className="h-8 w-8 text-base" />
              <div className="min-w-0">
                <p className="truncate font-disp text-[17px] leading-none tracking-wide">
                  {nome}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ambar/90">
                  PREMAG · {perfil ?? '…'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate('/alertas')}
                className="icon-btn"
                aria-label="Alertas"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
                  <path d="M10 20h4" />
                </svg>
                {alertas > 0 && (
                  <i className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-alerta" />
                )}
              </button>
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider ${
                  online ? 'border-white/10 text-papel/55' : 'border-ambar/50 text-ambar'
                }`}
              >
                <i
                  className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-400' : 'animate-pulse bg-ambar'}`}
                />
                {online ? 'On' : 'Off'}
              </span>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenu((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-ambar font-disp text-[13px] text-grafite"
                  aria-label="Menu da conta"
                  aria-expanded={menu}
                >
                  {iniciais(nome === '…' ? 'P' : nome)}
                </button>
                {menu && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-44 overflow-hidden rounded-xl border border-linha bg-papel py-1 text-grafite shadow-lg">
                    <button
                      type="button"
                      onClick={() => navigate('/conta')}
                      className="flex w-full px-3 py-2.5 text-left text-sm hover:bg-concreto"
                    >
                      Conta
                    </button>
                    {fila > 0 && (
                      <button
                        type="button"
                        onClick={() => navigate('/pendencias')}
                        className="flex w-full px-3 py-2.5 text-left text-sm text-[#9a6200] hover:bg-concreto"
                      >
                        {fila} na fila
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={sair}
                      className="flex w-full px-3 py-2.5 text-left text-sm text-alerta hover:bg-concreto"
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {fila > 0 && (
            <button
              type="button"
              onClick={() => navigate('/pendencias')}
              className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ambar"
            >
              {fila} lançamento{fila > 1 ? 's' : ''} na fila — tocar para enviar
            </button>
          )}
        </header>

        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-3 pt-4">
          {!esconderInstalar && (
            <div className="mb-3 rounded-xl border border-ambar/40 bg-ambar/10 p-3">
              <p className="text-sm text-grafite">
                {instalarEv
                  ? 'Instale o PREMAG na tela inicial para usar como aplicativo.'
                  : 'No celular: menu do navegador → Adicionar à tela inicial.'}
              </p>
              <div className="mt-2 flex gap-3">
                {instalarEv && (
                  <button
                    type="button"
                    className="btn-link"
                    onClick={async () => {
                      await instalarEv.prompt()
                      setInstalarEv(null)
                      sessionStorage.setItem('premag-instalar', '1')
                      setEsconderInstalar(true)
                    }}
                  >
                    Instalar
                  </button>
                )}
                <button
                  type="button"
                  className="font-mono text-[10px] uppercase tracking-wider text-aco"
                  onClick={() => {
                    sessionStorage.setItem('premag-instalar', '1')
                    setEsconderInstalar(true)
                  }}
                >
                  Agora não
                </button>
              </div>
            </div>
          )}
          <div key={location.pathname} className="rise-in pb-4">
            <Outlet />
          </div>
        </main>

        <nav className="z-40 shrink-0 border-t border-white/5 bg-grafite pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1">
          <div className="flex">
            {abas.map((aba) => {
              const ativa = abaAtiva?.label === aba.label
              return (
                <NavLink
                  key={aba.to + aba.label}
                  to={aba.to}
                  className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] transition ${
                    ativa ? 'text-ambar' : 'text-[#8b939a]'
                  }`}
                >
                  {ativa && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-ambar" />}
                  <IconeAba tipo={aba.icone} />
                  <span>{aba.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
