import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EquipeDto } from '../../app/models/entity/Cadastro.dto'
import type { FechamentoDiaDto } from '../../app/models/entity/Operacao.dto'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import { operacaoService } from '../../app/services/premag/operacao.service'
import { loadSession } from '../../app/services/premag/session'
import { ehEncarregado, podeGerir } from '../../app/services/premag/perfil'

function hojeIso() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function fmtData(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function diarioDoDia(data: string, equipeId: string) {
  const q = new URLSearchParams()
  if (data !== hojeIso()) q.set('data', data)
  if (equipeId) q.set('equipe', equipeId)
  const qs = q.toString()
  return qs ? `/diario?${qs}` : '/diario'
}

export default function FechamentoPage() {
  const session = loadSession()
  const gerir = podeGerir(session?.perfil)
  const encarregado = ehEncarregado(session?.perfil)
  const [data, setData] = useState(hojeIso())
  const [equipeId, setEquipeId] = useState(encarregado ? session?.equipeId ?? '' : '')
  const [equipes, setEquipes] = useState<EquipeDto[]>([])
  const [dia, setDia] = useState<FechamentoDiaDto | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (gerir) cadastroService.equipes().then(setEquipes).catch(() => undefined)
  }, [gerir])

  async function carregar() {
    const r = await operacaoService.fechamento({
      data,
      equipeId: equipeId || undefined,
    })
    setDia(r)
  }

  useEffect(() => {
    carregar().catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar o fechamento.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, equipeId])

  async function fechar() {
    setEnviando(true)
    setErro(null)
    try {
      setDia(await operacaoService.fecharDia({ data, equipeId: equipeId || null }))
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível fechar o dia.'))
    } finally {
      setEnviando(false)
    }
  }

  async function reabrir() {
    const texto = motivo.trim()
    if (texto.length < 3) {
      setErro('Informe o motivo da reabertura (pelo menos 3 letras).')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      setDia(
        await operacaoService.reabrirDia({
          data,
          equipeId: equipeId || null,
          motivoReabertura: texto,
        }),
      )
      setMotivo('')
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível reabrir o dia.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      {erro && <p className="alert alert-erro mb-3">{erro}</p>}

      <div className="rounded-xl border border-white/10 bg-grafite p-4 text-papel shadow-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ambar">Fechamento do dia</p>
        <p className="mt-1 font-disp text-2xl tracking-wide">{dia ? fmtData(dia.data) : '…'}</p>
        <p className="mt-2 text-sm text-[#9aa2a9]">
          Confirma que o apontamento da equipe está completo. Depois disso ninguém inicia, encerra, lança quantidade
          nem anexa foto neste dia — até a gerência reabrir com motivo. Passados {dia?.diasFechamento ?? 3} dias o
          calendário fecha sozinho e não reabre.
        </p>
        <Link
          to={diarioDoDia(data, equipeId)}
          className="mt-3 inline-block font-mono text-[10px] uppercase tracking-wider text-ambar hover:text-papel"
        >
          Abrir diário do dia
        </Link>
        {gerir && (
          <Link to="/historico" className="mt-2 block font-mono text-[10px] uppercase tracking-wider text-ambar">
            Histórico
          </Link>
        )}
      </div>

      {gerir && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">Data</span>
            <input
              type="date"
              className="input"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">Escopo</span>
            <select
              className="input"
              value={equipeId}
              onChange={(e) => setEquipeId(e.target.value)}
            >
              <option value="">Planta inteira</option>
              {equipes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="card p-3.5">
          <p className="kicker">HH apontado</p>
          <p className="metric-value mt-1 text-[1.4rem]">{dia?.horasApontadas ?? '—'}</p>
        </div>
        <div className="card p-3.5">
          <p className="kicker">Fotos</p>
          <p className="metric-value mt-1 text-[1.4rem]">{dia?.fotos ?? '—'}</p>
        </div>
        <div className="card p-3.5">
          <p className="kicker">Serviços abertos</p>
          <p className="metric-value mt-1 text-[1.4rem]">{dia?.apontamentosAbertos ?? '—'}</p>
        </div>
        <div className="card p-3.5">
          <p className="kicker">Presentes sem serviço</p>
          <p className="metric-value mt-1 text-[1.4rem]">{dia?.presentesSemServico ?? '—'}</p>
        </div>
      </div>

      <div className="mt-3 card-pad">
        <p className="kicker">{dia?.escopo ?? '…'}</p>
        {dia?.fechado ? (
          <>
            <p className="mt-1 font-disp text-xl text-alerta">Dia fechado</p>
            {dia.fechadoPorCalendario ? (
              <p className="mt-1 text-sm text-aco">Fechado pelo prazo de {dia.diasFechamento} dias (RN-15).</p>
            ) : (
              <p className="mt-1 text-sm text-aco">
                Fechado {dia.fechadoEm ? new Date(dia.fechadoEm).toLocaleString('pt-BR') : ''}
                {dia.fechadoPorNome ? ` por ${dia.fechadoPorNome}` : ''}.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-1 font-disp text-xl">Dia aberto</p>
            {dia?.reabertoEm && (
              <p className="mt-1 text-sm text-aco">
                Reaberto {new Date(dia.reabertoEm).toLocaleString('pt-BR')}
                {dia.motivoReabertura ? ` · ${dia.motivoReabertura}` : ''}.
              </p>
            )}
          </>
        )}
      </div>

      {dia && !dia.fechado && (
        <button
          type="button"
          disabled={enviando || (dia.apontamentosAbertos > 0)}
          onClick={() => void fechar()}
          className="btn-primary mt-4"
        >
          {enviando ? 'Fechando…' : 'Fechar o dia'}
        </button>
      )}
      {dia && !dia.fechado && dia.apontamentosAbertos > 0 && (
        <p className="mt-2 text-sm text-aco">Encerre os serviços abertos antes de fechar.</p>
      )}

      {dia?.fechado && gerir && !dia.fechadoPorCalendario && (
        <div className="mt-4">
          <input
            className="input"
            placeholder="Motivo da reabertura"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <button
            type="button"
            disabled={enviando}
            onClick={() => void reabrir()}
            className="btn-ghost mt-2 w-full py-3"
          >
            {enviando ? 'Reabrindo…' : 'Reabrir o dia'}
          </button>
          {erro && (
            <p className="alert alert-erro mt-2">{erro}</p>
          )}
        </div>
      )}
    </div>
  )
}
