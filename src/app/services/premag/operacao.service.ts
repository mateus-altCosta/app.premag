import { api } from './api.service'
import { clienteUuid } from './jornada'
import type {
  DiarioDto,
  FotoDto,
  FechamentoDiaDto,
  ImportacaoResultadoDto,
  OcorrenciaDto,
  RelatorioDto,
  TipoFoto,
} from '../../models/entity/Operacao.dto'

const blobs = new Map<string, string>()

export async function urlFotoAutenticada(id: string): Promise<string> {
  const ja = blobs.get(id)
  if (ja) return ja
  const r = await api.get(`/fotos/${id}/arquivo`, { responseType: 'blob' })
  const url = URL.createObjectURL(r.data)
  blobs.set(id, url)
  return url
}

export async function baixarComAuth(path: string, nome: string): Promise<void> {
  const r = await api.get(path, { responseType: 'blob' })
  const url = URL.createObjectURL(r.data)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

export const operacaoService = {
  fotos: (params?: { data?: string; frenteId?: string; colaboradorId?: string }) =>
    api.get<FotoDto[]>('/fotos', { params }).then((r) => r.data),

  enviarFoto: async (opts: {
    jpeg: Blob
    frenteId: string
    tipo: TipoFoto
    colaboradorId?: string | null
    apontamentoId?: string | null
    quantidade?: string
    observacao?: string
  }) => {
    const fd = new FormData()
    fd.append('clienteUuid', clienteUuid())
    fd.append('frenteId', opts.frenteId)
    fd.append('tipo', opts.tipo)
    if (opts.colaboradorId) fd.append('colaboradorId', opts.colaboradorId)
    if (opts.apontamentoId) fd.append('apontamentoId', opts.apontamentoId)
    if (opts.quantidade) fd.append('quantidade', opts.quantidade.replace(',', '.'))
    if (opts.observacao) fd.append('observacao', opts.observacao)
    fd.append('arquivo', opts.jpeg, 'foto.jpg')
    return api.post<FotoDto>('/fotos', fd, multipart).then((r) => r.data)
  },

  diario: (params?: { data?: string; equipeId?: string }) =>
    api.get<DiarioDto>('/diario', { params }).then((r) => r.data),

  diarioPdf: (params?: { data?: string; equipeId?: string }) => {
    const q = new URLSearchParams()
    if (params?.data) q.set('data', params.data)
    if (params?.equipeId) q.set('equipeId', params.equipeId)
    const qs = q.toString()
    return baixarComAuth(`/diario/pdf${qs ? `?${qs}` : ''}`, 'diario.pdf')
  },

  ocorrencias: (pendentes = true) =>
    api.get<OcorrenciaDto[]>('/ocorrencias', { params: { pendentes } }).then((r) => r.data),

  reconhecer: (id: string, justificativa?: string) =>
    api.post(`/ocorrencias/${id}/reconhecer`, { justificativa: justificativa || null }),

  relatorio: (tipo: string, periodo: string, obraId?: string) =>
    api
      .get<RelatorioDto>('/relatorios', { params: { tipo, periodo, obraId: obraId || undefined } })
      .then((r) => r.data),

  relatorioCsv: (tipo: string, periodo: string, obraId?: string) => {
    const q = new URLSearchParams({ tipo, periodo })
    if (obraId) q.set('obraId', obraId)
    return baixarComAuth(`/relatorios/csv?${q}`, `relatorio-${tipo}-${periodo}.csv`)
  },

  importarAfd: (arquivo: File) => {
    const fd = new FormData()
    fd.append('arquivo', arquivo)
    return api.post<ImportacaoResultadoDto>('/importacoes/afd', fd, multipart).then((r) => r.data)
  },

  importarColaboradores: (arquivo: File) => {
    const fd = new FormData()
    fd.append('arquivo', arquivo)
    return api.post<ImportacaoResultadoDto>('/importacoes/colaboradores', fd, multipart).then((r) => r.data)
  },

  fechamento: (params?: { data?: string; equipeId?: string }) =>
    api.get<FechamentoDiaDto>('/fechamentos', { params }).then((r) => r.data),

  fecharDia: (dto: { data?: string; equipeId?: string | null }) =>
    api.post<FechamentoDiaDto>('/fechamentos/fechar', dto).then((r) => r.data),

  reabrirDia: (dto: { data?: string; equipeId?: string | null; motivoReabertura: string }) =>
    api.post<FechamentoDiaDto>('/fechamentos/reabrir', dto).then((r) => r.data),
}
