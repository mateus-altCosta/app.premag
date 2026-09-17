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
    setEnviando(true)
    setErro(null)
    try {
      setDia(
        await operacaoService.reabrirDia({
          data,
          equipeId: equipeId || null,
          motivoReabertura: motivo,
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
      {erro && <p className="mb-3 text-sm text-red-700">{erro}</p>}

      <div className="rounded border border-[#3d4348] bg-grafite p-4 text-papel">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ambar">Fechamento do dia</p>
        <p className="mt-1 font-disp text-2xl">{dia ? fmtData(dia.data) : '…'}</p>
        <p className="mt-2 text-sm text-[#9aa2a9]">
          Confirma que o apontamento da equipe está completo. Depois disso ninguém inicia, encerra, lança quantidade
          nem anexa foto neste dia — até a gerência reabrir com motivo. Passados {dia?.diasFechamento ?? 3} dias o
          calendário fecha sozinho e não reabre.
        </p>
        <Link to="/diario" className="mt-3 inline-block font-mono text-[10px] uppercase tracking-wider text-ambar">
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
            <span className="font-mono text-[10px] uppercase text-aco">Data</span>
            <input
              type="date"
              className="mt-1 w-full rounded border border-[#CFCCC5] bg-papel px-2 py-2 text-sm"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-aco">Escopo</span>
            <select
              className="mt-1 w-full rounded border border-[#CFCCC5] bg-papel px-2 py-2 text-sm"
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
        <div className="rounded border border-[#CFCCC5] bg-papel p-3">
          <p className="font-mono text-[10px] uppercase text-aco">HH apontado</p>
          <p className="font-disp text-xl">{dia?.horasApontadas ?? '—'}</p>
        </div>
        <div className="rounded border border-[#CFCCC5] bg-papel p-3">
          <p className="font-mono text-[10px] uppercase text-aco">Fotos</p>
          <p className="font-disp text-xl">{dia?.fotos ?? '—'}</p>
        </div>
        <div className="rounded border border-[#CFCCC5] bg-papel p-3">
          <p className="font-mono text-[10px] uppercase text-aco">Serviços abertos</p>
          <p className="font-disp text-xl">{dia?.apontamentosAbertos ?? '—'}</p>
        </div>
        <div className="rounded border border-[#CFCCC5] bg-papel p-3">
          <p className="font-mono text-[10px] uppercase text-aco">Presentes sem serviço</p>
          <p className="font-disp text-xl">{dia?.presentesSemServico ?? '—'}</p>
        </div>
      </div>

      <div className="mt-3 rounded border border-[#CFCCC5] bg-papel p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-aco">{dia?.escopo ?? '…'}</p>
        {dia?.fechado ? (
          <>
            <p className="mt-1 font-disp text-xl text-[#8a2b22]">Dia fechado</p>
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
          className="mt-4 w-full rounded bg-ambar py-3 font-disp text-lg text-grafite disabled:opacity-50"
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
            className="w-full rounded border border-[#CFCCC5] px-3 py-2 text-sm"
            placeholder="Motivo da reabertura"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <button
            type="button"
            disabled={enviando}
            onClick={() => void reabrir()}
            className="mt-2 w-full border border-[#CFCCC5] py-3 font-mono text-[10px] uppercase tracking-wider"
          >
            {enviando ? 'Reabrindo…' : 'Reabrir o dia'}
          </button>
        </div>
      )}
    </div>
  )
}
