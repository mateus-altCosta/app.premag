import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function PageHead({
  kicker,
  titulo,
  sub,
  acao,
}: {
  kicker?: string
  titulo: string
  sub?: ReactNode
  acao?: ReactNode
}) {
  return (
    <header className="page-head">
      <div className="min-w-0 flex-1">
        {kicker && <p className="kicker">{kicker}</p>}
        <h2 className="page-title">{titulo}</h2>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {acao}
    </header>
  )
}

export function AlertMsg({
  tom = 'erro',
  children,
}: {
  tom?: 'erro' | 'ok' | 'aviso'
  children: ReactNode
}) {
  if (!children) return null
  return <p className={`mb-3 alert alert-${tom}`}>{children}</p>
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Chip({
  ativo,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { ativo?: boolean }) {
  return (
    <button type="button" className={`chip ${ativo ? 'chip-on' : ''}`} {...props}>
      {children}
    </button>
  )
}

export function Marca({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ambar text-[15px] font-bold tracking-tight text-grafite ${className}`}
      aria-hidden
    >
      P
    </span>
  )
}
