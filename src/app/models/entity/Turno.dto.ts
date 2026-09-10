export type SituacaoJornada = 'Presente' | 'Falta' | 'Ferias' | 'Afastado' | 'Folga'

export interface ApontamentoDto {
  id: string
  clienteUuid: string
  colaboradorId: string
  frenteId: string
  frenteNome: string
  frenteCor: string
  unidade: string
  obraId: string
  obraNome: string
  frenteIndireta: boolean
  data: string
  horaInicio: string
  horaFim?: string | null
  minutosEfetivos?: number | null
  motivoParadaId?: string | null
  motivoParadaNome?: string | null
  observacao?: string | null
  jornadaNaoVerificada: boolean
  aberto: boolean
  pendente?: boolean
}

export interface TurnoColaboradorDto {
  id: string
  matricula: string
  nome: string
  funcao: string
  ativo: boolean
  situacao: SituacaoJornada | number
  minutosApurados: number
  jornadaNaoVerificada: boolean
  jornadaEntrada?: string | null
  jornadaSaida?: string | null
  minutosTrabalhados: number
  minutosParados: number
  minutosNaoApropriados: number
  minutosOciosos: number
  custoHora?: number | null
  aberto?: ApontamentoDto | null
  apontamentos: ApontamentoDto[]
}

export interface TurnoDto {
  data: string
  equipeId: string
  equipeNome: string
  equipeCor: string
  jornadaInicio: string
  jornadaFim: string
  intervaloInicio: string
  intervaloFim: string
  jornadaPadraoMinutos: number
  colaboradores: TurnoColaboradorDto[]
  obras: import('./Cadastro.dto').ObraDto[]
  frentes: import('./Cadastro.dto').FrenteDto[]
  motivosParada: import('./Cadastro.dto').MotivoParadaDto[]
}

export interface EncerrarResultadoDto {
  apontamento: ApontamentoDto
  avisos: string[]
  quantidadeJaLancadaHoje?: number | null
}
