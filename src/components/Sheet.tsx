import type { ReactNode } from 'react'

export default function Sheet({
  titulo,
  onClose,
  children,
}: {
  titulo: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fechar" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-papel p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-disp text-xl">{titulo}</h2>
          <button type="button" onClick={onClose} className="font-mono text-[10px] uppercase tracking-wider text-aco">
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
