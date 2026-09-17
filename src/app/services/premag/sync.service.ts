import { api } from './api.service'
import { getDispositivoId } from './session'
import { filaStore, type ItemFila } from './idb'
import { avisarFila, estaOnline, isFalhaDeRede, marcarAlcanceApi } from './rede'
import { operacaoService } from './operacao.service'

export interface ResultadoItemLote {
  indice: number
  tipo: string
  clienteUuid?: string | null
  aceito: boolean
  codigo?: string | null
  detalhe?: string | null
  avisos: string[]
}

export interface LoteResultado {
  id: string
  itensRecebidos: number
  itensAceitos: number
  itensRejeitados: number
  resultados: ResultadoItemLote[]
}

let emCurso = false

export async function contarFila(): Promise<number> {
  return (await filaStore.listar()).length
}

export async function listarFila(): Promise<ItemFila[]> {
  return filaStore.listar()
}

export async function enfileirar(item: Omit<ItemFila, 'id' | 'criadoEm' | 'tentativas'>): Promise<void> {
  await filaStore.enfileirar(item)
  avisarFila()
}

export async function sincronizarFila(): Promise<LoteResultado | null> {
  if (emCurso || !estaOnline()) return null
  const itens = await filaStore.listar()
  if (itens.length === 0) return null

  emCurso = true
  try {
    const fotos = itens.filter((i) => i.tipo === 'foto')
    const resto = itens.filter((i) => i.tipo !== 'foto')

    if (resto.length > 0) {
      const corpo = {
        dispositivoId: getDispositivoId(),
        itens: resto.map((i) => ({
          tipo: i.tipo,
          apontamentoId: i.apontamentoId,
          apontamentoClienteUuid: i.apontamentoClienteUuid,
          iniciar: i.iniciar,
          encerrar: i.encerrar,
          producao: i.producao,
        })),
      }
      const { data } = await api.post<LoteResultado>('/sync/lote', corpo)
      marcarAlcanceApi(true)
      for (const r of data.resultados ?? []) {
        const local = resto[r.indice]
        if (!local?.id) continue
        if (r.aceito) await filaStore.remover(local.id)
        else await filaStore.marcarErro(local.id, r.detalhe || r.codigo || 'Rejeitado')
      }
    }

    for (const f of fotos) {
      if (!f.id || !f.jpeg || !f.foto) continue
      try {
        await operacaoService.enviarFoto({
          jpeg: f.jpeg,
          frenteId: f.foto.frenteId,
          tipo: f.foto.tipo as 'Avanco' | 'Ocorrencia' | 'RecebimentoMaterial',
          colaboradorId: f.foto.colaboradorId,
          apontamentoId: f.foto.apontamentoId,
          quantidade: f.foto.quantidade,
          observacao: f.foto.observacao,
          clienteUuid: f.foto.clienteUuid,
        })
        await filaStore.remover(f.id)
      } catch (err) {
        if (isFalhaDeRede(err)) {
          marcarAlcanceApi(false)
          throw err
        }
        await filaStore.marcarErro(f.id, 'Foto rejeitada')
      }
    }

    avisarFila()
    return { id: '', itensRecebidos: itens.length, itensAceitos: 0, itensRejeitados: 0, resultados: [] }
  } catch (err) {
    if (isFalhaDeRede(err)) marcarAlcanceApi(false)
    throw err
  } finally {
    emCurso = false
  }
}
