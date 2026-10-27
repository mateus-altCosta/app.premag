import { useEffect, useState } from 'react'
import type { MotivoParadaDto } from '../../app/models/entity/Cadastro.dto'
import type { OcorrenciaDto } from '../../app/models/entity/Operacao.dto'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import { operacaoService } from '../../app/services/premag/operacao.service'
import { ativarPush, desligarPush } from '../../app/services/premag/push'

function hojeIso() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function fmtQuando(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR')
}

export default function AlertasPage() {
  const [lista, setLista] = useState<OcorrenciaDto[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [justif, setJustif] = useState<Record<string, string>>({})
  const [gerar, setGerar] = useState<Record<string, boolean>>({})
  const [motivo, setMotivo] = useState<Record<string, string>>({})
  const [motivos, setMotivos] = useState<MotivoParadaDto[]>([])
  const [enviando, setEnviando] = useState<string | null>(null)
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [pendentes, setPendentes] = useState(true)
  const [data, setData] = useState(hojeIso())

  async function carregar(abertos = pendentes, dia = data) {
    setErro(null)
    setLista([])
    setLista(await operacaoService.ocorrencias(abertos, dia))
  }

  useEffect(() => {
    cadastroService.catalogos().then((c) => setMotivos(c.motivosParada)).catch(() => undefined)
  }, [])

  useEffect(() => {
    carregar(pendentes, data).catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar os alertas.')))
  }, [pendentes, data])

  const esc2 = lista.filter((a) => a.severidade === 2)
  const outros = lista.filter((a) => a.severidade !== 2)

  async function reconhecer(id: string, exige: boolean) {
    setEnviando(id)
    setErro(null)
    try {
      await operacaoService.reconhecer(id, exige ? justif[id] : undefined, {
        gerarParada: gerar[id],
        motivoParadaId: motivo[id],
      })
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
        className={`card p-3.5 ${
          crit ? 'border-alerta/40 ring-1 ring-alerta/10' : 'border-ambar/50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-disp text-[15px] leading-tight">{a.titulo}</p>
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-aco">
            {crit ? 'Gerência + Diretoria' : 'Equipe'}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-aco">{a.detalhe}</p>
        {!pendentes && (
          <p className="mt-2 text-xs text-aco">
            {a.reconhecidaPorNome ? `${a.reconhecidaPorNome} · ` : ''}
            {fmtQuando(a.reconhecidaEm)}
            {a.justificativa ? ` · ${a.justificativa}` : ''}
            {a.gerouParada ? ' · gerou parada' : ''}
          </p>
        )}
        {pendentes && crit && (
          <input
            className="input mt-2"
            placeholder="Justificativa"
            value={justif[a.id] ?? ''}
            onChange={(e) => setJustif((j) => ({ ...j, [a.id]: e.target.value }))}
          />
        )}
        {pendentes && a.colaboradorId && (
          <label className="mt-2 flex items-center gap-2 text-sm text-aco">
            <input
              type="checkbox"
              checked={!!gerar[a.id]}
              onChange={(e) => setGerar((g) => ({ ...g, [a.id]: e.target.checked }))}
            />
            Lançar a parada correspondente
          </label>
        )}
        {pendentes && gerar[a.id] && (
          <div className="mt-2 flex flex-wrap gap-2">
            {motivos.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMotivo((x) => ({ ...x, [a.id]: m.id }))}
                className={`chip ${motivo[a.id] === m.id ? 'chip-on' : ''}`}
              >
                {m.nome}
              </button>
            ))}
          </div>
        )}
        {pendentes && (
          <button
            type="button"
            disabled={enviando === a.id}
            onClick={() => reconhecer(a.id, crit)}
            className="btn-link mt-2"
          >
            {enviando === a.id ? 'Salvando…' : 'Reconhecer'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="card-pad">
        <p className="kicker">Regra de escalonamento</p>
        <p className="mt-1.5 text-sm text-aco">
          Colaborador presente e fora de qualquer frente por mais de 60 minutos corridos gera notificação para Gerência
          e Diretoria. O relógio desconta o intervalo e ignora faltas, férias e afastados.
        </p>
        <button
          type="button"
          className="btn-link mt-3"
          onClick={async () => {
            const r = await ativarPush('manual')
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
          className="mt-2 block text-[13px] font-medium text-aco"
          onClick={async () => {
            await desligarPush()
            setPushMsg('Notificações desligadas neste aparelho.')
          }}
        >
          Desligar notificações neste aparelho
        </button>
        {pushMsg && <p className="mt-2 text-sm text-aco">{pushMsg}</p>}
      </div>
      {erro && <p className="alert alert-erro mt-3">{erro}</p>}
      <div className="seg mt-3">
        <button
          type="button"
          className={`seg-item ${pendentes ? 'seg-item-on' : ''}`}
          onClick={() => setPendentes(true)}
        >
          Pendentes
        </button>
        <button
          type="button"
          className={`seg-item ${!pendentes ? 'seg-item-on' : ''}`}
          onClick={() => setPendentes(false)}
        >
          Reconhecidos
        </button>
      </div>
      <label className="mt-3 block">
        <span className="label">Dia</span>
        <input
          type="date"
          className="input"
          value={data}
          max={hojeIso()}
          onChange={(e) => setData(e.target.value || hojeIso())}
        />
      </label>
      {lista.length === 0 && !erro && (
        <p className="empty mt-4">
          {pendentes ? 'Nada pendente agora.' : 'Nenhum alerta reconhecido neste dia.'}
        </p>
      )}
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
