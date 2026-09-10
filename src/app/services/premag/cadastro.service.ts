import { api } from './api.service'
import type {
  CatalogoDto,
  ColaboradorDto,
  CriarColaboradorDto,
  CriarFrenteDto,
  CriarObraDto,
  EquipeDto,
  FrenteDto,
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
  colaboradores: (equipeId: string) =>
    comCache(`colaboradores:${equipeId}`, () =>
      api.get<ColaboradorDto[]>(`/equipes/${equipeId}/colaboradores`).then((r) => r.data),
    ),
  criarColaborador: (dto: CriarColaboradorDto) =>
    api.post<ColaboradorDto>('/colaboradores', dto).then((r) => r.data),
  transferir: (id: string, equipeId: string) =>
    api.put<ColaboradorDto>(`/colaboradores/${id}/equipe`, { equipeId }).then((r) => r.data),
  excluirColaborador: (id: string) => api.delete(`/colaboradores/${id}`),
  obras: () => comCache('obras', () => api.get<ObraDto[]>('/obras').then((r) => r.data)),
  obra: (id: string) => comCache(`obra:${id}`, () => api.get<ObraDto>(`/obras/${id}`).then((r) => r.data)),
  criarObra: (dto: CriarObraDto) => api.post<ObraDto>('/obras', dto).then((r) => r.data),
  frentesDaObra: (obraId: string) =>
    comCache(`frentes:${obraId}`, () => api.get<FrenteDto[]>(`/obras/${obraId}/frentes`).then((r) => r.data)),
  criarFrente: (dto: CriarFrenteDto) => api.post<FrenteDto>('/frentes', dto).then((r) => r.data),
}
