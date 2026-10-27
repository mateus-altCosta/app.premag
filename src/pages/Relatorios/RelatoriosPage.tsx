import { useEffect, useState } from 'react'
import type { EquipeDto, ObraDto } from '../../app/models/entity/Cadastro.dto'
import type { RelatorioDto, RelatorioLinhaDto } from '../../app/models/entity/Operacao.dto'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import { operacaoService } from '../../app/services/premag/operacao.service'

const TIPOS = [
  { id: 'produtividade', label: 'Produtividade' },
  { id: 'avanco', label: 'Avanço' },
]
const PERIODOS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
]

const n0 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const n2 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

function segmento(ativo: boolean) {
  return `seg-item ${ativo ? 'seg-item-on' : ''}`
}

function Metrica({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string
  valor: string
  tom?: string
}) {
  return (
    <div>
      <p className={`font-disp text-[22px] leading-none tabular-nums ${tom ?? 'text-grafite'}`}>{valor}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-aco">{rotulo}</p>
    </div>
  )
}

function desvio(l: RelatorioLinhaDto) {
  if (l.desvioPercentual == null) return { texto: '—', tom: undefined as string | undefined }
  const acima = l.desvioPercentual > 0
  return {
    texto: `${acima ? '▲' : '▼'} ${n0(Math.abs(l.desvioPercentual))}%`,
    tom: acima ? 'text-alerta' : 'text-ok',
  }
}

export default function RelatoriosPage() {
  const [tipo, setTipo] = useState('produtividade')
  const [periodo, setPeriodo] = useState('hoje')
  const [obraId, setObraId] = useState('')
  const [equipeId, setEquipeId] = useState('')
  const [obras, setObras] = useState<ObraDto[]>([])
  const [equipes, setEquipes] = useState<EquipeDto[]>([])
  const [rel, setRel] = useState<RelatorioDto | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [baixando, setBaixando] = useState(false)

  useEffect(() => {
    cadastroService.obras().then(setObras).catch(() => undefined)
    cadastroService.equipes().then(setEquipes).catch(() => undefined)
  }, [])

  useEffect(() => {
    operacaoService
      .relatorio(tipo, periodo, obraId || undefined, equipeId || undefined)
      .then(setRel)
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar o relatório.')))
  }, [tipo, periodo, obraId, equipeId])

  async function exportar(formato: 'csv' | 'pdf') {
    setBaixando(true)
    setErro(null)
    try {
      if (formato === 'pdf') await operacaoService.relatorioPdf(tipo, periodo, obraId || undefined, equipeId || undefined)
      else await operacaoService.relatorioCsv(tipo, periodo, obraId || undefined, equipeId || undefined)
    } catch (e) {
      setErro(mensagemErro(e, formato === 'pdf' ? 'Não foi possível gerar o PDF.' : 'Não foi possível exportar o CSV.'))
    } finally {
      setBaixando(false)
    }
  }

  const linhas = rel?.linhas ?? []
  const unidades = [...new Set(linhas.map((l) => l.unidade).filter(Boolean))]
  const hhCab = unidades.length === 1 ? `HH/${unidades[0]}` : 'HH/un.'
  const amostraCurta =
    tipo === 'produtividade' && linhas.some((l) => l.amostraInsuficiente && l.quantidade > 0)
  const tipoNome = TIPOS.find((t) => t.id === tipo)?.label ?? 'Relatório'
  const periodoNome = PERIODOS.find((p) => p.id === periodo)?.label ?? ''

  function indice(l: RelatorioLinhaDto) {
    if (l.hhPorUnidade == null) return { valor: '—', rotulo: hhCab }
    const marca = l.amostraInsuficiente && l.quantidade > 0 ? ' *' : ''
    return {
      valor: `${n2(l.hhPorUnidade)}${marca}`,
      rotulo: unidades.length === 1 ? hhCab : `HH/${l.unidade}`,
    }
  }

  function unEst(l: RelatorioLinhaDto) {
    if (l.acoEstimadoKg) return `${n0(l.acoEstimadoKg)} ${l.taxaAcoUnidade || 'kg'}`
    return `${n0(l.quantidadeConcluida)} ${l.unidade}`
  }

  return (
    <div>
      {erro && <p className="alert alert-erro mb-3">{erro}</p>}

      <div className="card-pad">
        <p className="kicker">
          Relatório · {tipoNome}
          {rel?.escopo ? ` · ${rel.escopo}` : ''}
        </p>
        <p className="mt-1 font-disp text-2xl leading-tight tracking-wide">{periodoNome}</p>

        <div className="seg mt-4">
          {TIPOS.map((t) => (
            <button key={t.id} type="button" className={segmento(tipo === t.id)} onClick={() => setTipo(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="seg mt-2">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" className={segmento(periodo === p.id)} onClick={() => setPeriodo(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="label">Obra</span>
          <select
            className="input"
            value={obraId}
            onChange={(e) => setObraId(e.target.value)}
          >
            <option value="">Todas as obras</option>
            {obras
              .filter((o) => !o.interna)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
          </select>
        </label>
        <label className="mt-3 block">
          <span className="label">Equipe</span>
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

      <div className="mt-4">
        <h3 className="font-disp text-lg tracking-wide">Frentes</h3>
        <p className="kicker mb-2">
          {linhas.length} {linhas.length === 1 ? 'frente' : 'frentes'}
        </p>

        {linhas.length === 0 && (
          <p className="empty">
            Nenhuma frente neste recorte.
          </p>
        )}

        <div className="space-y-2">
          {tipo === 'produtividade'
            ? linhas.map((l) => {
                const hhUn = indice(l)
                const vs = desvio(l)
                return (
                  <article key={l.frenteId} className="card p-3.5">
                    <p className="font-disp text-[16px] leading-tight tracking-wide">{l.frenteNome}</p>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                      <Metrica rotulo="Horas" valor={`${n0(l.hh)} HH`} />
                      <Metrica rotulo="Quantidade" valor={`${n0(l.quantidade)} ${l.unidade}`} />
                      <Metrica rotulo={hhUn.rotulo} valor={hhUn.valor} />
                      <Metrica rotulo="vs cotado" valor={vs.texto} tom={vs.tom} />
                    </div>
                  </article>
                )
              })
            : linhas.map((l) => (
                <article key={l.frenteId} className="card p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-disp text-[16px] leading-tight tracking-wide">{l.frenteNome}</p>
                    <p className="shrink-0 font-disp text-xl tabular-nums">{n0(l.percentualAvanco)}%</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E4E1DA]">
                    <div
                      className="h-full rounded-full bg-ambar"
                      style={{ width: `${Math.min(100, Math.max(0, l.percentualAvanco))}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                    <Metrica rotulo="Previsto" valor={`${n0(l.quantidadePrevista)} ${l.unidade}`} />
                    <Metrica rotulo="Feito" valor={`${n0(l.quantidadeConcluida)} ${l.unidade}`} />
                    <Metrica rotulo="Un. est." valor={unEst(l)} />
                    <Metrica rotulo="Horas" valor={`${n0(l.hh)} HH`} />
                  </div>
                </article>
              ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-aco">{rel?.nota}</p>
      {amostraCurta && (
        <p className="mt-2 text-xs text-aco">
          Índice com * tem menos de 5 lançamentos. A Diretoria pode exportar mesmo assim.
        </p>
      )}
      <button
        type="button"
        onClick={() => void exportar('pdf')}
        disabled={baixando}
        className="btn-primary mt-3"
      >
        {baixando ? 'Gerando…' : 'Exportar PDF'}
      </button>
      <button
        type="button"
        onClick={() => void exportar('csv')}
        disabled={baixando}
        className="btn-dark mt-2 font-mono text-[11px] uppercase tracking-wider"
      >
        {baixando ? 'Gerando…' : 'Exportar CSV'}
      </button>
    </div>
  )
}
