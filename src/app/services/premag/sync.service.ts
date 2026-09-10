import { api } from './api.service'
import { getDispositivoId } from './session'
import { filaStore, type ItemFila } from './idb'
import { avisarFila, estaOnline, isFalhaDeRede, marcarAlcanceApi } from './rede'

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
    const corpo = {
      dispositivoId: getDispositivoId(),
      itens: itens.map((i) => ({
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
      const local = itens[r.indice]
      if (!local?.id) continue
      if (r.aceito) await filaStore.remover(local.id)
      else await filaStore.marcarErro(local.id, r.detalhe || r.codigo || 'Rejeitado')
    }
    avisarFila()
    return data
  } catch (err) {
    if (isFalhaDeRede(err)) marcarAlcanceApi(false)
    throw err
  } finally {
    emCurso = false
  }
}
