import type { ApontamentoDto } from '../app/models/entity/Turno.dto'
import { agoraNaJornada, paraMinutos } from '../app/services/premag/jornada'

export default function Regua({
  apontamentos,
  jornadaInicio,
  jornadaFim,
  intervaloInicio,
  intervaloFim,
}: {
  apontamentos: ApontamentoDto[]
  jornadaInicio: string
  jornadaFim: string
  intervaloInicio: string
  intervaloFim: string
}) {
  const ini = paraMinutos(jornadaInicio)
  const fim = paraMinutos(jornadaFim)
  const almocoIni = paraMinutos(intervaloInicio)
  const almocoFim = paraMinutos(intervaloFim)
  const agora = agoraNaJornada(jornadaInicio, jornadaFim)
  const total = Math.max(1, fim - ini)
  const segs: { w: number; cor: string | null; aberto?: boolean }[] = []
  let cur = ini
  const ordenados = [...apontamentos].sort((a, b) => paraMinutos(a.horaInicio) - paraMinutos(b.horaInicio))
  for (const a of ordenados) {
    const aIni = paraMinutos(a.horaInicio)
    const aFim = a.horaFim ? paraMinutos(a.horaFim) : agora
    if (aIni - cur > 2) segs.push({ w: aIni - cur, cor: null })
    segs.push({ w: Math.max(0, aFim - aIni), cor: a.frenteCor, aberto: !a.horaFim })
    cur = Math.max(cur, aFim)
  }
  if (fim - cur > 1) segs.push({ w: fim - cur, cor: null })

  return (
    <div className="flex h-5 overflow-hidden rounded border border-[#CFCCC5]">
      {segs.map((s, i) => (
        <span
          key={i}
          className={s.aberto ? 'animate-pulse' : undefined}
          style={{
            width: `${(s.w / total) * 100}%`,
            background: s.cor ?? undefined,
            backgroundImage: s.cor
              ? undefined
              : 'repeating-linear-gradient(135deg,#E8E6E1 0 6px,#B9B5AC 6px 12px)',
            opacity: !s.cor && cur > almocoIni && cur < almocoFim ? 0.7 : 1,
          }}
        />
      ))}
    </div>
  )
}
