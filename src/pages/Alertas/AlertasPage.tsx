import { useEffect, useState } from 'react'
import type { OcorrenciaDto } from '../../app/models/entity/Operacao.dto'
import { mensagemErro } from '../../app/services/premag/cadastro.service'
import { operacaoService } from '../../app/services/premag/operacao.service'
import { ativarPush, desligarPush } from '../../app/services/premag/push'

export default function AlertasPage() {
  const [lista, setLista] = useState<OcorrenciaDto[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [justif, setJustif] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState<string | null>(null)
  const [pushMsg, setPushMsg] = useState<string | null>(null)

  async function carregar() {
    setLista(await operacaoService.ocorrencias(true))
  }

  useEffect(() => {
    carregar().catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar os alertas.')))
  }, [])

  const esc2 = lista.filter((a) => a.severidade === 2)
  const outros = lista.filter((a) => a.severidade !== 2)

  async function reconhecer(id: string, exige: boolean) {
    setEnviando(id)
    setErro(null)
    try {
      await operacaoService.reconhecer(id, exige ? justif[id] : undefined)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível reconhecer.'))
    } finally {
      setEnviando(null)
    }
  }

  function card(a: OcorrenciaDto) {
    const crit = a.severidade === 2
    return (
      <div
        key={a.id}
        className={`rounded border bg-papel p-3 ${
          crit ? 'border-red-800/50' : 'border-ambar/60'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-disp text-[15px] leading-tight">{a.titulo}</p>
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-aco">
            {crit ? 'Gerência + Diretoria' : 'Equipe'}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-aco">{a.detalhe}</p>
        {crit && (
          <input
            className="mt-2 w-full rounded border border-[#CFCCC5] px-3 py-2 text-sm"
            placeholder="Justificativa"
            value={justif[a.id] ?? ''}
            onChange={(e) => setJustif((j) => ({ ...j, [a.id]: e.target.value }))}
          />
        )}
        <button
          type="button"
          disabled={enviando === a.id}
          onClick={() => reconhecer(a.id, crit)}
          className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[#B07500]"
        >
          {enviando === a.id ? 'Salvando…' : 'Reconhecer'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="rounded border border-[#3d4348] bg-grafite p-4 text-papel">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ambar">Regra de escalonamento</p>
        <p className="mt-1.5 text-sm text-[#9aa2a9]">
          Colaborador presente e fora de qualquer frente por mais de 60 minutos corridos gera notificação para Gerência
          e Diretoria. O relógio desconta o intervalo e ignora faltas, férias e afastados.
        </p>
        <button
          type="button"
          className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ambar"
          onClick={async () => {
            const r = await ativarPush()
            setPushMsg(
              r === 'ok'
                ? 'Notificações ativas neste aparelho.'
                : r === 'negado'
                  ? 'O navegador bloqueou as notificações.'
                  : r === 'desligado'
                    ? 'Push ainda não está ligado neste ambiente.'
                    : 'Este aparelho não recebe push (use o app instalado em HTTPS).',
            )
          }}
        >
          Ativar notificações neste aparelho
        </button>
        <button
          type="button"
          className="mt-2 block font-mono text-[10px] uppercase tracking-wider text-[#9aa2a9]"
          onClick={async () => {
            await desligarPush()
            setPushMsg('Notificações desligadas neste aparelho.')
          }}
        >
          Desligar notificações neste aparelho
        </button>
        {pushMsg && <p className="mt-2 text-sm text-[#9aa2a9]">{pushMsg}</p>}
      </div>
      {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}
      {lista.length === 0 && !erro && <p className="mt-4 rounded border border-dashed border-[#CFCCC5] bg-papel p-4 text-sm text-aco">Nada pendente agora.</p>}
      {esc2.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 font-disp text-lg">Escalonados ({esc2.length})</h3>
          <div className="space-y-2">{esc2.map(card)}</div>
        </div>
      )}
      {outros.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 font-disp text-lg">Da equipe</h3>
          <div className="space-y-2">{outros.map(card)}</div>
        </div>
      )}
      <p className="mt-4 text-xs text-aco">
        A regra roda no servidor sobre os dados já sincronizados, não no aparelho. O disparo é operacional, com trilha —
        não substitui apuração disciplinar.
      </p>
    </div>
  )
}
