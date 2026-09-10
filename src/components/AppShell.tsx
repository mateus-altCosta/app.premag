import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authService, type UsuarioAtual } from '../app/services/premag/authService.service'
import { loadSession } from '../app/services/premag/session'
import { ehEncarregado, ehDiretoria, podeGerir } from '../app/services/premag/perfil'
import { contarFila, sincronizarFila } from '../app/services/premag/sync.service'
import { estaOnline, onFila, onRede, verificarAlcance } from '../app/services/premag/rede'
import { operacaoService } from '../app/services/premag/operacao.service'

type AbaIcone = 'equipe' | 'obras' | 'diario' | 'alertas' | 'relatorios'

function itemClass(ativo: boolean) {
  return `flex flex-1 flex-col items-center gap-1 py-2.5 font-mono text-[9px] uppercase tracking-wider ${
    ativo ? 'text-ambar' : 'text-[#7d858c]'
  }`
}

function IconeAba({ tipo }: { tipo: AbaIcone }) {
  const props = {
    width: 19,
    height: 19,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
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
  return (
    <svg {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  )
}

export default function AppShell() {
  const navigate = useNavigate()
  const session = loadSession()
  const [me, setMe] = useState<UsuarioAtual | null>(null)
  const [online, setOnline] = useState(estaOnline())
  const [fila, setFila] = useState(0)
  const [alertas, setAlertas] = useState(0)
  const perfil = me?.perfil ?? session?.perfil
  const encarregado = ehEncarregado(perfil)
  const gerir = podeGerir(perfil)
  const diretoria = ehDiretoria(perfil)
  const equipeHome = me?.equipeId ?? session?.equipeId

  useEffect(() => {
    authService.me().then(setMe).catch(() => undefined)
    contarFila().then(setFila).catch(() => undefined)
    operacaoService.ocorrencias(true).then((l) => setAlertas(l.length)).catch(() => undefined)
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
    }
  }, [])

  async function sair() {
    await authService.logout()
    navigate('/login', { replace: true })
  }

  const abas: { to: string; label: string; icone: AbaIcone }[] = encarregado
    ? [
        { to: equipeHome ? `/equipes/${equipeHome}` : '/equipes', label: 'Equipe', icone: 'equipe' },
        { to: '/diario', label: 'Diário', icone: 'diario' },
        { to: '/alertas', label: 'Alertas', icone: 'alertas' },
      ]
    : diretoria
      ? [
          { to: '/equipes', label: 'Equipes', icone: 'equipe' },
          { to: '/obras', label: 'Obras', icone: 'obras' },
          { to: '/relatorios', label: 'Relatórios', icone: 'relatorios' },
          { to: '/diario', label: 'Diário', icone: 'diario' },
        ]
      : gerir
        ? [
            { to: '/equipes', label: 'Equipes', icone: 'equipe' },
            { to: '/obras', label: 'Obras', icone: 'obras' },
            { to: '/diario', label: 'Diário', icone: 'diario' },
            { to: '/alertas', label: 'Alertas', icone: 'alertas' },
          ]
        : [
            { to: '/equipes', label: 'Equipes', icone: 'equipe' },
            { to: '/obras', label: 'Obras', icone: 'obras' },
          ]

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-concreto">
      <header className="bg-grafite px-5 pb-3 pt-4 text-papel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ambar">
              PREMAG · {perfil ?? '…'}
            </p>
            <h1 className="mt-1 font-disp text-2xl leading-tight">{me?.nome ?? session?.nome ?? '…'}</h1>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/alertas')}
                className="relative border border-[#3d4348] px-2 py-2 text-aco"
                aria-label="Alertas"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
                  <path d="M10 20h4" />
                </svg>
                {alertas > 0 && (
                  <i
                    className="absolute right-1 top-1 h-2 w-2 rounded-full"
                    style={{ background: alertas > 0 ? '#C0392B' : 'var(--ambar)' }}
                  />
                )}
              </button>
              <span
                className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
                  online ? 'border-[#3d4348] text-[#8b939a]' : 'border-ambar text-ambar'
                }`}
              >
                {online ? 'ON' : 'OFF'}
              </span>
              <button
                type="button"
                onClick={sair}
                className="border border-[#3d4348] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-aco"
              >
                Sair
              </button>
            </div>
            {fila > 0 && (
              <button
                type="button"
                onClick={() => navigate('/pendencias')}
                className="font-mono text-[10px] uppercase tracking-wider text-ambar"
              >
                {fila} na fila
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t-2 border-ambar bg-grafite pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {abas.map((aba) => (
            <NavLink
              key={aba.to + aba.label}
              to={aba.to}
              className={({ isActive }) => itemClass(isActive)}
            >
              <IconeAba tipo={aba.icone} />
              <span>{aba.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
