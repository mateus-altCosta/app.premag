import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarFila, sincronizarFila } from '../../app/services/premag/sync.service'
import type { ItemFila } from '../../app/services/premag/idb'
import { estaOnline as onlineRede, onFila, onRede } from '../../app/services/premag/rede'
import { mensagemErro } from '../../app/services/premag/cadastro.service'

function rotulo(tipo: string) {
  if (tipo === 'iniciar') return 'Início de serviço'
  if (tipo === 'encerrar') return 'Encerramento'
  if (tipo === 'producao') return 'Quantidade da frente'
  return tipo
}

export default function PendenciasPage() {
  const navigate = useNavigate()
  const [itens, setItens] = useState<ItemFila[]>([])
  const [online, setOnline] = useState(onlineRede())
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() {
    setItens(await listarFila())
  }

  useEffect(() => {
    carregar().catch(() => undefined)
    const offF = onFila(() => carregar().catch(() => undefined))
    const offR = onRede(() => setOnline(onlineRede()))
    return () => {
      offF()
      offR()
    }
  }, [])

  async function enviar() {
    setEnviando(true)
    setErro(null)
    try {
      await sincronizarFila()
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível enviar a fila. Confira se a API está no ar.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-3 font-mono text-[10px] uppercase tracking-wider text-aco"
      >
        ← Voltar
      </button>
      <p className="mb-1 font-disp text-xl">Pendências</p>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-aco">
        {online ? 'Rede disponível' : 'Sem rede — os lançamentos ficam neste aparelho'}
      </p>
      {erro && <p className="mb-3 text-sm text-red-700">{erro}</p>}
      {itens.length === 0 ? (
        <p className="text-sm text-aco">Nada na fila. O que você apontar sem internet aparece aqui.</p>
      ) : (
        <div className="space-y-2">
          {itens.map((i) => (
            <div key={i.id} className="rounded border border-[#CFCCC5] bg-papel p-3">
              <div className="flex justify-between gap-2">
                <span className="font-disp text-[15px]">{rotulo(i.tipo)}</span>
                <span className="font-mono text-[10px] uppercase text-aco">
                  {i.criadoEm ? new Date(i.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              {i.erro && <p className="mt-1 text-xs text-red-700">{i.erro}</p>}
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={!online || enviando || itens.length === 0}
        onClick={enviar}
        className="mt-4 w-full rounded bg-ambar py-3 font-disp text-lg text-grafite disabled:opacity-40"
      >
        {enviando ? 'Enviando…' : 'Enviar fila'}
      </button>
    </div>
  )
}
