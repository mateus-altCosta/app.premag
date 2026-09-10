export interface EquipeDto {
  id: string
  nome: string
  cor: string
  ativa: boolean
  presentes: number
  encarregadoId?: string | null
}

export interface ColaboradorDto {
  id: string
  matricula: string
  nome: string
  funcao: string
  equipeId: string
  equipeNome: string
  ativo: boolean
  origemCadastro: number
  custoHora?: number | null
}

export interface ObraDto {
  id: string
  nome: string
  cliente: string
  tipo: string
  local: string
  codigoSienge?: string | null
  interna: boolean
  status: number
  quantidadeFrentes: number
  percentualAvanco: number
}

export interface FrenteDto {
  id: string
  obraId: string
  obraNome: string
  nome: string
  etapaId: string
  etapaNome: string
  etapaIndireta: boolean
  equipeId?: string | null
  equipeNome?: string | null
  unidade: string
  quantidadePrevista: number
  quantidadeConcluida: number
  percentualAvanco: number
  taxaAcoKgPorUnidade?: number | null
  hhOrcadoPorUnidade?: number | null
  cor: string
  ativa: boolean
  hhDireto?: number | null
  hhIndiretoRateado?: number | null
  hhTotal?: number | null
  hhPorUnidade?: number | null
  desvioPercentual?: number | null
  amostraInsuficiente?: boolean
  acoEstimadoKg?: number | null
  custoTotal?: number | null
  custoPorUnidade?: number | null
  ritmo?: number | null
  diasParaConcluir?: number | null
}

export interface EtapaDto {
  id: string
  nome: string
  ordem: number
  indireta: boolean
}

export interface MotivoParadaDto {
  id: string
  nome: string
  exigeObservacao: boolean
}

export interface CatalogoDto {
  etapas: EtapaDto[]
  motivosParada: MotivoParadaDto[]
  unidades: string[]
  configuracao: {
    jornadaPadraoMinutos: number
    jornadaInicio: string
    jornadaFim: string
    intervaloInicio: string
    intervaloFim: string
  }
}

export interface CriarColaboradorDto {
  matricula: string
  nome: string
  funcao: string
  equipeId: string
}

export interface CriarObraDto {
  nome: string
  cliente: string
  tipo: string
  local: string
  codigoSienge?: string
}

export interface CriarFrenteDto {
  obraId: string
  nome: string
  etapaId: string
  equipeId?: string | null
  unidade: string
  quantidadePrevista: number
  taxaAcoKgPorUnidade?: number | null
  hhOrcadoPorUnidade?: number | null
  itemOrcamentoSienge?: string
  cor?: string
}
