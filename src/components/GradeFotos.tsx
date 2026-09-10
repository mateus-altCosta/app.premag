import { useEffect, useRef, useState, type PointerEvent, type TouchEvent, type TouchList, type WheelEvent } from 'react'
import { urlFotoAutenticada } from '../app/services/premag/operacao.service'
import type { FotoDto } from '../app/models/entity/Operacao.dto'

export default function GradeFotos({ fotos, colunas = 3 }: { fotos: FotoDto[]; colunas?: number }) {
  const [aberta, setAberta] = useState<FotoDto | null>(null)
  if (fotos.length === 0) return null
  return (
    <>
      <div className={`grid gap-1.5 ${colunas === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {fotos.map((f) => (
          <Thumb key={f.id} foto={f} onAbrir={() => setAberta(f)} />
        ))}
      </div>
      {aberta && <VisorFoto foto={aberta} onClose={() => setAberta(null)} />}
    </>
  )
}

function rotuloTipo(foto: FotoDto) {
  return foto.tipo === 0 || foto.tipo === 'Avanco'
    ? 'Avanço'
    : foto.tipo === 1 || foto.tipo === 'Ocorrencia'
      ? 'Ocorrência'
      : 'Recebimento'
}

function horaFoto(foto: FotoDto) {
  return foto.capturadaEm
    ? new Date(foto.capturadaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : ''
}

function Thumb({ foto, onAbrir }: { foto: FotoDto; onAbrir: () => void }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    urlFotoAutenticada(foto.id)
      .then((u) => {
        if (vivo) setSrc(u)
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [foto.id])

  return (
    <button
      type="button"
      onClick={() => src && onAbrir()}
      className="overflow-hidden rounded border border-[#CFCCC5] bg-[#E4E1DA] text-left"
      aria-label="Ampliar foto"
    >
      {src ? (
        <img src={src} alt="" className="aspect-square w-full object-cover" />
      ) : (
        <div className="aspect-square bg-[#CFCCC5]" />
      )}
      <p className="truncate px-1 py-0.5 font-mono text-[9px] uppercase text-aco">
        {horaFoto(foto)} · {rotuloTipo(foto)}
        {foto.quantidade ? ` · ${foto.quantidade}` : ''}
      </p>
    </button>
  )
}

function VisorFoto({ foto, onClose }: { foto: FotoDto; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null)
  const [escala, setEscala] = useState(1)
  const [ox, setOx] = useState(0)
  const [oy, setOy] = useState(0)
  const arrasto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const pinça = useRef<{ dist: number; escala: number } | null>(null)

  useEffect(() => {
    urlFotoAutenticada(foto.id).then(setSrc).catch(() => undefined)
  }, [foto.id])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', esc)
    }
  }, [onClose])

  function aplicarZoom(proxima: number) {
    const n = Math.min(4, Math.max(1, Math.round(proxima * 20) / 20))
    setEscala(n)
    if (n <= 1) {
      setOx(0)
      setOy(0)
    }
  }

  function onWheel(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault()
    aplicarZoom(escala + (e.deltaY < 0 ? 0.25 : -0.25))
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (escala <= 1) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    arrasto.current = { x: e.clientX, y: e.clientY, ox, oy }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const a = arrasto.current
    if (!a) return
    setOx(a.ox + (e.clientX - a.x))
    setOy(a.oy + (e.clientY - a.y))
  }

  function onPointerUp() {
    arrasto.current = null
  }

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      arrasto.current = null
      pinça.current = { dist: distToques(e.touches), escala }
    }
  }

  function onTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2 && pinça.current) {
      e.preventDefault()
      const fator = distToques(e.touches) / pinça.current.dist
      aplicarZoom(pinça.current.escala * fator)
    }
  }

  function onTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length < 2) pinça.current = null
  }

  function duploToque() {
    aplicarZoom(escala > 1 ? 1 : 2.5)
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/92" role="dialog" aria-modal="true" aria-label="Foto ampliada">
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-papel">
        <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-wider">
          {horaFoto(foto)} · {rotuloTipo(foto)}
          {foto.frenteNome ? ` · ${foto.frenteNome}` : ''}
          {foto.quantidade ? ` · ${foto.quantidade}` : ''}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 border border-[#3d4348] px-3 py-2 font-mono text-[10px] uppercase tracking-wider"
        >
          Fechar
        </button>
      </div>
      <div
        className="relative min-h-0 flex-1 touch-none overflow-hidden"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={duploToque}
      >
        {src ? (
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute left-1/2 top-1/2 max-h-full max-w-full select-none object-contain"
            style={{
              transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px)) scale(${escala})`,
              cursor: escala > 1 ? 'grab' : 'zoom-in',
            }}
          />
        ) : (
          <p className="flex h-full items-center justify-center font-mono text-[11px] uppercase text-[#8b939a]">
            Carregando…
          </p>
        )}
      </div>
      <div className="flex items-center justify-center gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <button
          type="button"
          onClick={() => aplicarZoom(escala - 0.5)}
          disabled={escala <= 1}
          className="h-12 w-12 rounded border border-[#3d4348] font-disp text-2xl text-papel disabled:opacity-30"
          aria-label="Diminuir zoom"
        >
          −
        </button>
        <span className="w-14 text-center font-mono text-[11px] text-[#8b939a]">{Math.round(escala * 100)}%</span>
        <button
          type="button"
          onClick={() => aplicarZoom(escala + 0.5)}
          disabled={escala >= 4}
          className="h-12 w-12 rounded border border-[#3d4348] font-disp text-2xl text-papel disabled:opacity-30"
          aria-label="Aumentar zoom"
        >
          +
        </button>
      </div>
    </div>
  )
}

function distToques(toques: TouchList) {
  const a = toques[0]
  const b = toques[1]
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}
