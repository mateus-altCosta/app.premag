import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuditLogDto } from '../../app/models/entity/Operacao.dto'
import { mensagemErro } from '../../app/services/premag/cadastro.service'
import { operacaoService } from '../../app/services/premag/operacao.service'

function rotuloAcao(acao: string) {
  if (acao === 'transferir-equipe') return 'Moveu de equipe'
  if (acao === 'criar-colab') return 'Cadastrou colaborador'
  if (acao === 'fechar-dia') return 'Fechou o dia'
  if (acao === 'fechar-auto') return 'Dia fechado no fim da jornada'
  if (acao === 'reabrir-dia') return 'Reabriu o dia'
  if (acao === 'alterar-senha') return 'Trocou a senha'
  return acao
}

export default function HistoricoPage() {
  const navigate = useNavigate()
  const [lista, setLista] = useState<AuditLogDto[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    operacaoService
      .historico()
      .then(setLista)
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar o histórico.')))
  }, [])

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-3 font-mono text-[10px] uppercase tracking-wider text-aco"
      >
        ← Voltar
      </button>
      <p className="font-disp text-xl">Histórico</p>
      <p className="mt-1 text-sm text-aco">Quem cadastrou, moveu de equipe, fechou ou reabriu o dia.</p>
      {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}
      <div className="mt-3 space-y-2">
        {lista.map((a) => (
          <div key={a.id} className="rounded border border-[#CFCCC5] bg-papel p-3">
            <div className="flex justify-between gap-2">
              <p className="font-disp text-[15px]">{rotuloAcao(a.acao)}</p>
              <span className="shrink-0 font-mono text-[10px] uppercase text-aco">
                {new Date(a.em).toLocaleString('pt-BR')}
              </span>
            </div>
            <p className="mt-1 text-sm text-aco">
              {a.usuarioNome} · {a.entidade}
            </p>
            {a.depois && <p className="mt-1 break-all text-xs text-aco">{a.depois}</p>}
          </div>
        ))}
        {lista.length === 0 && !erro && (
          <p className="text-sm text-aco">Ainda não há registros neste ambiente.</p>
        )}
      </div>
    </div>
  )
}
