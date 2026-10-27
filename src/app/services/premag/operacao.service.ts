import { api } from './api.service'
import { clienteUuid } from './jornada'
import type {
  DiarioDto,
  FotoDto,
  FechamentoDiaDto,
  AuditLogDto,
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

function nomeDoAnexo(header: unknown, fallback: string) {
  if (typeof header !== 'string' || !header) return fallback
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf) {
    try {
      return decodeURIComponent(utf[1])
    } catch {
      return fallback
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1] : fallback
}

export async function baixarComAuth(path: string, nome: string): Promise<void> {
  const r = await api.get(path, { responseType: 'blob' })
  const url = URL.createObjectURL(r.data)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeDoAnexo(r.headers['content-disposition'], nome)
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
    clienteUuid?: string
    latitude?: number
    longitude?: number
  }) => {
    const fd = new FormData()
    fd.append('clienteUuid', opts.clienteUuid || clienteUuid())
    fd.append('frenteId', opts.frenteId)
    fd.append('tipo', opts.tipo)
    if (opts.colaboradorId) fd.append('colaboradorId', opts.colaboradorId)
    if (opts.apontamentoId) fd.append('apontamentoId', opts.apontamentoId)
    if (opts.quantidade) fd.append('quantidade', opts.quantidade.replace(',', '.'))
    if (opts.observacao) fd.append('observacao', opts.observacao)
    if (opts.latitude != null) fd.append('latitude', String(opts.latitude))
    if (opts.longitude != null) fd.append('longitude', String(opts.longitude))
    fd.append('arquivo', opts.jpeg, 'foto.jpg')
    return api.post<FotoDto>('/fotos', fd, multipart).then((r) => r.data)
  },

  excluirFoto: (id: string) => api.delete(`/fotos/${id}`),

  diario: (params?: { data?: string; equipeId?: string }) =>
    api.get<DiarioDto>('/diario', { params }).then((r) => r.data),

  diarioPdf: (params?: { data?: string; equipeId?: string }, nomeArquivo?: string) => {
    const q = new URLSearchParams()
    if (params?.data) q.set('data', params.data)
    if (params?.equipeId) q.set('equipeId', params.equipeId)
    const qs = q.toString()
    return baixarComAuth(`/diario/pdf${qs ? `?${qs}` : ''}`, nomeArquivo || 'diario.pdf')
  },

  ocorrencias: (pendentes = true, data?: string) =>
    api.get<OcorrenciaDto[]>('/ocorrencias', { params: { pendentes, data: data || undefined } }).then((r) => r.data),

  reconhecer: (id: string, justificativa?: string, opts?: { gerarParada?: boolean; motivoParadaId?: string }) =>
    api.post(`/ocorrencias/${id}/reconhecer`, {
      justificativa: justificativa || null,
      gerarParada: !!opts?.gerarParada,
      motivoParadaId: opts?.motivoParadaId || null,
    }),

  relatorio: (tipo: string, periodo: string, obraId?: string, equipeId?: string) =>
    api
      .get<RelatorioDto>('/relatorios', {
        params: { tipo, periodo, obraId: obraId || undefined, equipeId: equipeId || undefined },
      })
      .then((r) => r.data),

  relatorioCsv: (tipo: string, periodo: string, obraId?: string, equipeId?: string) => {
    const q = new URLSearchParams({ tipo, periodo })
    if (obraId) q.set('obraId', obraId)
    if (equipeId) q.set('equipeId', equipeId)
    return baixarComAuth(`/relatorios/csv?${q}`, `relatorio-${tipo}-${periodo}.csv`)
  },

  relatorioPdf: (tipo: string, periodo: string, obraId?: string, equipeId?: string) => {
    const q = new URLSearchParams({ tipo, periodo })
    if (obraId) q.set('obraId', obraId)
    if (equipeId) q.set('equipeId', equipeId)
    return baixarComAuth(`/relatorios/pdf?${q}`, `relatorio-${tipo}-${periodo}.pdf`)
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

  historico: (take = 80) => api.get<AuditLogDto[]>('/historico', { params: { take } }).then((r) => r.data),
}
