export type TipoFoto = 'Avanco' | 'Ocorrencia' | 'RecebimentoMaterial'

export interface FotoDto {
  id: string
  clienteUuid: string
  frenteId: string
  frenteNome: string
  colaboradorId?: string | null
  colaboradorNome?: string | null
  tipo: TipoFoto | number
  quantidade?: number | null
  observacao?: string | null
  capturadaEm: string
  url: string
  urlThumb: string
}

export interface DiarioFrenteDto {
  frenteId: string
  nome: string
  obraNome: string
  cor: string
  unidade: string
  horas: number
  pessoas: number
  quantidade: number
  semQuantidade: boolean
}

export interface DiarioDto {
  data: string
  escopo: string
  frentes: DiarioFrenteDto[]
  funcoes: { funcao: string; quantidade: number }[]
  situacoes: { situacao: string; quantidade: number }[]
  fotos: FotoDto[]
  fotosAvanco: number
}

export interface OcorrenciaDto {
  id: string
  tipo: string | number
  severidade: number
  titulo: string
  detalhe: string
  colaboradorId?: string | null
  colaboradorNome?: string | null
  frenteId?: string | null
  frenteNome?: string | null
  equipeId?: string | null
  data: string
  detectadaEm: string
  minutosDecorridos?: number | null
  reconhecidaEm?: string | null
  justificativa?: string | null
}

export interface RelatorioLinhaDto {
  frenteId: string
  frenteNome: string
  unidade: string
  hh: number
  quantidade: number
  hhPorUnidade?: number | null
  desvioPercentual?: number | null
  quantidadePrevista: number
  quantidadeConcluida: number
  percentualAvanco: number
  acoEstimadoKg?: number | null
  custoPorUnidade?: number | null
}

export interface RelatorioDto {
  tipo: string
  periodo: string
  linhas: RelatorioLinhaDto[]
  nota: string
}

export interface ImportacaoResultadoDto {
  lidos: number
  gravados: number
  ignorados: number
  avisos: string[]
}

export interface FechamentoDiaDto {
  data: string
  equipeId?: string | null
  escopo: string
  fechado: boolean
  fechadoPorCalendario: boolean
  fechadoEm?: string | null
  fechadoPorNome?: string | null
  reabertoEm?: string | null
  motivoReabertura?: string | null
  diasFechamento: number
  apontamentosAbertos: number
  presentesSemServico: number
  fotos: number
  horasApontadas: number
}
