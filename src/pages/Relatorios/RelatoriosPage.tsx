import { useEffect, useState } from 'react'
import type { ObraDto } from '../../app/models/entity/Cadastro.dto'
import type { RelatorioDto } from '../../app/models/entity/Operacao.dto'
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

  async function csv() {
    setBaixando(true)
    setErro(null)
    try {
      await operacaoService.relatorioCsv(tipo, periodo, obraId || undefined)
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível exportar o CSV.'))
    } finally {
      setBaixando(false)
    }
  }

  function tag(ativo: boolean) {
    return `rounded border px-3 py-1.5 font-mono text-[11px] uppercase ${
      ativo ? 'border-ambar bg-ambar text-grafite' : 'border-[#CFCCC5]'
    }`
  }

  const n0 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  const n2 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

  return (
    <div>
      {erro && <p className="mb-3 text-sm text-red-700">{erro}</p>}
      <div className="rounded border border-[#CFCCC5] bg-papel p-4">
        <p className="mb-2 font-mono text-[10px] uppercase text-aco">Tipo</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <button key={t.id} type="button" className={tag(tipo === t.id)} onClick={() => setTipo(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="mb-2 font-mono text-[10px] uppercase text-aco">Período</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" className={tag(periodo === p.id)} onClick={() => setPeriodo(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="mb-2 font-mono text-[10px] uppercase text-aco">Obra</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={tag(!obraId)} onClick={() => setObraId('')}>
            todas
          </button>
          {obras.filter((o) => !o.interna).map((o) => (
            <button key={o.id} type="button" className={tag(obraId === o.id)} onClick={() => setObraId(o.id)}>
              {o.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded border border-[#CFCCC5] bg-papel p-3">
        {tipo === 'produtividade' ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-mono text-[10px] uppercase text-aco">
                <th className="pb-2">Frente</th>
                <th>HH</th>
                <th>Qtd</th>
                <th>HH/un</th>
                <th>vs cotado</th>
              </tr>
            </thead>
            <tbody>
              {(rel?.linhas ?? []).map((l) => (
                <tr key={l.frenteId} className="border-t border-[#E4E1DA]">
                  <td className="py-2 pr-2">{l.frenteNome}</td>
                  <td>{n0(l.hh)}</td>
                  <td>
                    {n0(l.quantidade)} {l.unidade}
                  </td>
                  <td>{l.hhPorUnidade != null ? n2(l.hhPorUnidade) : '—'}</td>
                  <td className={l.desvioPercentual && l.desvioPercentual > 0 ? 'text-red-800' : 'text-green-800'}>
                    {l.desvioPercentual != null
                      ? `${l.desvioPercentual > 0 ? '▲' : '▼'} ${n0(Math.abs(l.desvioPercentual))}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-mono text-[10px] uppercase text-aco">
                <th className="pb-2">Frente</th>
                <th>Prev</th>
                <th>Feito</th>
                <th>%</th>
                <th>Aço est.</th>
              </tr>
            </thead>
            <tbody>
              {(rel?.linhas ?? []).map((l) => (
                <tr key={l.frenteId} className="border-t border-[#E4E1DA]">
                  <td className="py-2 pr-2">{l.frenteNome}</td>
                  <td>{n0(l.quantidadePrevista)}</td>
                  <td>{n0(l.quantidadeConcluida)}</td>
                  <td>{n0(l.percentualAvanco)}%</td>
                  <td>{l.acoEstimadoKg ? `${n0(l.acoEstimadoKg / 1000)} t` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-aco">{rel?.nota}</p>
      <button
        type="button"
        onClick={csv}
        disabled={baixando}
        className="mt-3 h-12 w-full rounded bg-grafite font-mono text-[11px] uppercase tracking-wider text-papel disabled:opacity-50"
      >
        {baixando ? 'Gerando…' : 'Exportar CSV'}
      </button>
    </div>
  )
}
