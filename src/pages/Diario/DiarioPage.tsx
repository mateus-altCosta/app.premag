import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { EquipeDto } from '../../app/models/entity/Cadastro.dto'
import type { DiarioDto } from '../../app/models/entity/Operacao.dto'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import { operacaoService } from '../../app/services/premag/operacao.service'
import { loadSession } from '../../app/services/premag/session'
import { ehEncarregado, podeGerir } from '../../app/services/premag/perfil'
import GradeFotos from '../../components/GradeFotos'
import { AlertMsg, EmptyState, PageHead } from '../../components/ui'

function hojeIso() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function fmtData(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default function DiarioPage() {
  const session = loadSession()
  const [params, setParams] = useSearchParams()
  const hoje = hojeIso()
  const data = (params.get('data') || hoje) > hoje ? hoje : params.get('data') || hoje
  const [diario, setDiario] = useState<DiarioDto | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [baixando, setBaixando] = useState(false)
  const [equipes, setEquipes] = useState<EquipeDto[]>([])
  const gerir = podeGerir(session?.perfil)
  const equipeFiltro = ehEncarregado(session?.perfil) ? session?.equipeId ?? '' : params.get('equipe') || ''
  const equipeId = equipeFiltro || undefined

  useEffect(() => {
    if (gerir) cadastroService.equipes().then(setEquipes).catch(() => undefined)
  }, [gerir])

  useEffect(() => {
    operacaoService
      .diario({ equipeId, data })
      .then(setDiario)
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar o diário.')))
  }, [equipeId, data])

  function escolherData(iso: string) {
    const next = !iso || iso > hoje ? hoje : iso
    const q: Record<string, string> = {}
    if (next !== hoje) q.data = next
    if (gerir && equipeFiltro) q.equipe = equipeFiltro
    setParams(q, { replace: true })
  }

  function escolherEquipe(id: string) {
    const q: Record<string, string> = {}
    if (data !== hoje) q.data = data
    if (id) q.equipe = id
    setParams(q, { replace: true })
  }

  async function pdf() {
    setBaixando(true)
    setErro(null)
    try {
      const equipe = (diario?.escopo || 'equipe').replace(/[\\/:*?"<>|]/g, ' ').trim()
      const rotulo = fmtData(data).replace(/\//g, '-')
      await operacaoService.diarioPdf({ equipeId, data }, `Diário ${equipe} ${rotulo}.PDF`)
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível gerar o PDF.'))
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div>
      <PageHead kicker="Operação" titulo="Diário" sub={diario?.escopo ?? 'Registro do dia'} />
      {erro && <AlertMsg>{erro}</AlertMsg>}
      <div className="card-pad">
        <p className="kicker">
          {diario?.escopo ?? '…'}
        </p>
        <p className="mt-1 font-disp text-2xl tracking-wide">{diario ? fmtData(diario.data) : '…'}</p>
        <label className="mt-3 block">
          <span className="label">Dia</span>
          <input
            type="date"
            className="input"
            value={data}
            max={hoje}
            onChange={(e) => escolherData(e.target.value)}
          />
        </label>
        {gerir && (
          <label className="mt-3 block">
            <span className="label">Equipe</span>
            <select
              className="input"
              value={equipeFiltro}
              onChange={(e) => escolherEquipe(e.target.value)}
            >
              <option value="">Planta inteira</option>
              {equipes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-4">
        <h3 className="mb-2 font-disp text-lg tracking-wide">Serviços do dia</h3>
        <div className="space-y-2">
          {(diario?.frentes ?? []).map((f) => (
            <div key={f.frenteId} className="card-row">
              <span className="card-accent" style={{ background: f.cor }} />
              <div className="flex-1 p-3.5">
                <p className="font-disp text-[15px] tracking-wide">{f.nome}</p>
                <p className="kicker mt-1">
                  {f.obraNome} · {f.horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h · {f.pessoas} pessoas
                  {f.quantidade > 0 ? ` · ${f.quantidade} ${f.unidade}` : ''}
                </p>
                {f.semQuantidade && (
                  <span className="badge mt-2 border-ambar/40 text-ambar">
                    sem quantidade
                  </span>
                )}
              </div>
            </div>
          ))}
          {diario && diario.frentes.length === 0 && (
            <EmptyState>Nenhum serviço apontado neste dia.</EmptyState>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="card p-3.5">
          <p className="kicker">Equipe</p>
          {(diario?.funcoes ?? []).map((f) => (
            <div key={f.funcao} className="mt-1.5 flex justify-between text-sm">
              <span>{f.funcao}</span>
              <b className="font-mono">{f.quantidade}</b>
            </div>
          ))}
        </div>
        <div className="card p-3.5">
          <p className="kicker">Observações</p>
          {(diario?.situacoes ?? []).length === 0 ? (
            <p className="mt-1.5 text-xs text-aco">Sem faltas ou afastamentos.</p>
          ) : (
            diario?.situacoes.map((s) => (
              <div key={s.situacao} className="mt-1.5 flex justify-between text-sm">
                <span>{s.situacao}</span>
                <b className="font-mono">{s.quantidade}</b>
              </div>
            ))
          )}
          <p className="mt-2 text-[11px] text-aco">Faltas, férias e afastamentos vêm da folha — não são digitados aqui.</p>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="mb-2 font-disp text-lg tracking-wide">Registro fotográfico</h3>
        {diario && diario.fotos.length === 0 ? (
          <p className="empty">
            Nenhuma foto anexada {data === hoje ? 'hoje' : 'neste dia'}. Fotos de avanço entram no PDF do diário e
            sustentam a medição.
          </p>
        ) : (
          <>
            <GradeFotos
              fotos={diario?.fotos ?? []}
              podeExcluir={gerir}
              onExcluida={() =>
                operacaoService.diario({ equipeId, data }).then(setDiario).catch(() => undefined)
              }
            />
            {diario && diario.fotos.length > 0 && (
              <p className="mt-2 text-xs text-aco">
                {diario.fotosAvanco} de {diario.fotos.length} registros marcados como avanço, com quantidade vinculada à
                frente.
              </p>
            )}
          </>
        )}
      </div>

      {data === hoje && (
        <Link
          to="/fechamento"
          className="mt-3 inline-block btn-link"
        >
          Fechar o dia
        </Link>
      )}

      <button
        type="button"
        onClick={pdf}
        disabled={baixando}
        className="btn-primary mt-4 h-14"
      >
        {baixando ? 'Gerando…' : 'EXPORTAR PDF'}
      </button>
    </div>
  )
}
