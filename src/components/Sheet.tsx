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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-grafite/50 backdrop-blur-[2px] sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fechar" onClick={onClose} />
      <div className="rise-in relative z-10 max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl bg-papel p-5 shadow-lg sm:rounded-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-linha sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
          <button type="button" onClick={onClose} className="btn-ghost py-1.5">
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
