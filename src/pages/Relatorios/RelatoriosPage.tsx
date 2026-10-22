import { useEffect, useState } from 'react'
import type { ObraDto } from '../../app/models/entity/Cadastro.dto'
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
  return `flex-1 rounded px-2 py-2 font-mono text-[11px] uppercase tracking-wider ${
    ativo ? 'bg-ambar text-grafite' : 'text-aco'
  }`
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
    tom: acima ? 'text-red-800' : 'text-green-800',
  }
}

export default function RelatoriosPage() {
  const [tipo, setTipo] = useState('produtividade')
  const [periodo, setPeriodo] = useState('hoje')
  const [obraId, setObraId] = useState('')
  const [obras, setObras] = useState<ObraDto[]>([])
  const [rel, setRel] = useState<RelatorioDto | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [baixando, setBaixando] = useState(false)

  useEffect(() => {
    cadastroService.obras().then(setObras).catch(() => undefined)
  }, [])

  useEffect(() => {
    operacaoService
      .relatorio(tipo, periodo, obraId || undefined)
      .then(setRel)
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar o relatório.')))
  }, [tipo, periodo, obraId])

  async function exportar(formato: 'csv' | 'pdf') {
    setBaixando(true)
    setErro(null)
    try {
      if (formato === 'pdf') await operacaoService.relatorioPdf(tipo, periodo, obraId || undefined)
      else await operacaoService.relatorioCsv(tipo, periodo, obraId || undefined)
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
      {erro && <p className="mb-3 text-sm text-red-700">{erro}</p>}

      <div className="rounded border border-[#CFCCC5] bg-papel p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-aco">Relatório · {tipoNome}</p>
        <p className="mt-1 font-disp text-2xl leading-tight">{periodoNome}</p>

        <div className="mt-4 flex gap-1 rounded border border-[#CFCCC5] bg-white p-1">
          {TIPOS.map((t) => (
            <button key={t.id} type="button" className={segmento(tipo === t.id)} onClick={() => setTipo(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-1 rounded border border-[#CFCCC5] bg-white p-1">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" className={segmento(periodo === p.id)} onClick={() => setPeriodo(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="font-mono text-[10px] uppercase text-aco">Obra</span>
          <select
            className="mt-1 w-full rounded border border-[#CFCCC5] bg-white px-2 py-2 text-sm"
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
      </div>

      <div className="mt-4">
        <h3 className="font-disp text-lg">Frentes</h3>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-aco">
          {linhas.length} {linhas.length === 1 ? 'frente' : 'frentes'}
        </p>

        {linhas.length === 0 && (
          <p className="rounded border border-dashed border-[#CFCCC5] bg-papel p-4 text-sm text-aco">
            Nenhuma frente neste recorte.
          </p>
        )}

        <div className="space-y-2">
          {tipo === 'produtividade'
            ? linhas.map((l) => {
                const hhUn = indice(l)
                const vs = desvio(l)
                return (
                  <article key={l.frenteId} className="rounded border border-[#CFCCC5] bg-papel p-3">
                    <p className="font-disp text-[16px] leading-tight">{l.frenteNome}</p>
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
                <article key={l.frenteId} className="rounded border border-[#CFCCC5] bg-papel p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-disp text-[16px] leading-tight">{l.frenteNome}</p>
                    <p className="shrink-0 font-disp text-xl tabular-nums">{n0(l.percentualAvanco)}%</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded bg-[#E4E1DA]">
                    <div
                      className="h-full bg-ambar"
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
        className="mt-3 h-12 w-full rounded bg-ambar font-disp text-lg text-grafite disabled:opacity-50"
      >
        {baixando ? 'Gerando…' : 'Exportar PDF'}
      </button>
      <button
        type="button"
        onClick={() => void exportar('csv')}
        disabled={baixando}
        className="mt-2 h-12 w-full rounded bg-grafite font-mono text-[11px] uppercase tracking-wider text-papel disabled:opacity-50"
      >
        {baixando ? 'Gerando…' : 'Exportar CSV'}
      </button>
    </div>
  )
}
