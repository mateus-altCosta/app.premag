import { api } from './api.service'
import type {
  CatalogoDto,
  ColaboradorDto,
  CriarColaboradorDto,
  CriarEquipeDto,
  CriarFrenteDto,
  CriarMotivoParadaDto,
  CriarObraDto,
  EquipeDto,
  FrenteDto,
  MotivoParadaDto,
  ObraDto,
} from '../../models/entity/Cadastro.dto'
import { kv } from './idb'
import { isFalhaDeRede, marcarAlcanceApi } from './rede'

export { mensagemErro } from './turno.service'

async function comCache<T>(chave: string, buscar: () => Promise<T>): Promise<T> {
  try {
    const valor = await buscar()
    marcarAlcanceApi(true)
    await kv.set(chave, valor)
    return valor
  } catch (err) {
    if (!isFalhaDeRede(err)) throw err
    marcarAlcanceApi(false)
    const cached = await kv.get<T>(chave)
    if (cached !== undefined) return cached
    throw err
  }
}

export const cadastroService = {
  catalogos: () => comCache('catalogos', () => api.get<CatalogoDto>('/catalogos').then((r) => r.data)),
  equipes: () => comCache('equipes', () => api.get<EquipeDto[]>('/equipes').then((r) => r.data)),
  criarEquipe: (dto: CriarEquipeDto) => api.post<EquipeDto>('/equipes', dto).then((r) => r.data),
  atualizarEquipe: (id: string, dto: CriarEquipeDto) =>
    api.put<EquipeDto>(`/equipes/${id}`, dto).then((r) => r.data),
  atualizarJornada: (dto: CatalogoDto['configuracao']) =>
    api.put<CatalogoDto>('/catalogos/configuracao', dto).then((r) => r.data),
  criarMotivo: async (dto: CriarMotivoParadaDto) => {
    const r = await api.post<MotivoParadaDto>('/catalogos/motivos', dto)
    await kv.del('catalogos')
    return r.data
  },
  atualizarMotivo: async (id: string, dto: CriarMotivoParadaDto) => {
    const r = await api.put<MotivoParadaDto>(`/catalogos/motivos/${id}`, dto)
    await kv.del('catalogos')
    return r.data
  },
  inativarMotivo: async (id: string) => {
    await api.delete(`/catalogos/motivos/${id}`)
    await kv.del('catalogos')
  },
  colaboradores: (equipeId: string) =>
    comCache(`colaboradores:${equipeId}`, () =>
      api.get<ColaboradorDto[]>(`/equipes/${equipeId}/colaboradores`).then((r) => r.data),
    ),
  criarColaborador: (dto: CriarColaboradorDto) =>
    api.post<ColaboradorDto>('/colaboradores', dto).then((r) => r.data),
  atualizarColaborador: (
    id: string,
    dto: { nome: string; funcao: string; custoHora?: number | null; codigoExterno?: string | null },
  ) => api.put<ColaboradorDto>(`/colaboradores/${id}`, dto).then((r) => r.data),
  transferir: async (id: string, equipeId: string) => {
    const r = await api.put<ColaboradorDto>(`/colaboradores/${id}/equipe`, { equipeId })
    const chaves = await kv.keys()
    await Promise.all(chaves.filter((k) => k.startsWith('colaboradores:') || k.startsWith('turno:')).map((k) => kv.del(k)))
    return r.data
  },
  excluirColaborador: async (id: string) => {
    await api.delete(`/colaboradores/${id}`)
    const chaves = await kv.keys()
    await Promise.all(chaves.filter((k) => k.startsWith('colaboradores:') || k.startsWith('turno:')).map((k) => kv.del(k)))
  },
  obras: () => comCache('obras', () => api.get<ObraDto[]>('/obras').then((r) => r.data)),
  obra: (id: string) => comCache(`obra:${id}`, () => api.get<ObraDto>(`/obras/${id}`).then((r) => r.data)),
  criarObra: (dto: CriarObraDto) => api.post<ObraDto>('/obras', dto).then((r) => r.data),
  atualizarObra: (id: string, dto: CriarObraDto & { status: number }) =>
    api.put<ObraDto>(`/obras/${id}`, dto).then((r) => r.data),
  frentesDaObra: (obraId: string) =>
    comCache(`frentes:${obraId}`, () => api.get<FrenteDto[]>(`/obras/${obraId}/frentes`).then((r) => r.data)),
  criarFrente: (dto: CriarFrenteDto) => api.post<FrenteDto>('/frentes', dto).then((r) => r.data),
  atualizarFrente: (id: string, dto: CriarFrenteDto) =>
    api.put<FrenteDto>(`/frentes/${id}`, dto).then((r) => r.data),
  encerrarFrente: (id: string) => api.delete(`/frentes/${id}`),
}
