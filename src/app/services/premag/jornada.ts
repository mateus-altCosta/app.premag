export function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function formatarHora(minutos: number): string {
  const m = Math.max(0, Math.round(minutos))
  const h = Math.floor(m / 60)
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function horas(minutos: number): string {
  return (minutos / 60).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function agoraNaJornada(jornadaInicio: string, jornadaFim: string): number {
  const d = new Date()
  const agora = d.getHours() * 60 + d.getMinutes()
  return Math.min(paraMinutos(jornadaFim), Math.max(paraMinutos(jornadaInicio), agora))
}

export function clienteUuid(): string {
  return crypto.randomUUID()
}

export function fmtCustoHora(valor: number): string {
  return `${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / h`
}

export function rotuloPonto(entrada?: string | null, saida?: string | null): string | null {
  if (!entrada && !saida) return null
  if (entrada && saida) return `Ponto ${entrada}–${saida}`
  if (entrada) return `Entrada ${entrada}`
  return `Saída ${saida}`
}
