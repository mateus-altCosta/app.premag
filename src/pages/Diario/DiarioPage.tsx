import { useEffect, useState } from 'react'
import type { DiarioDto } from '../../app/models/entity/Operacao.dto'
import { mensagemErro } from '../../app/services/premag/cadastro.service'
import { operacaoService } from '../../app/services/premag/operacao.service'
import { loadSession } from '../../app/services/premag/session'
import { ehEncarregado } from '../../app/services/premag/perfil'
import GradeFotos from '../../components/GradeFotos'

function fmtData(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default function DiarioPage() {
  const session = loadSession()
  const [diario, setDiario] = useState<DiarioDto | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [baixando, setBaixando] = useState(false)
  const equipeId = ehEncarregado(session?.perfil) ? session?.equipeId ?? undefined : undefined

  useEffect(() => {
    operacaoService
      .diario({ equipeId })
      .then(setDiario)
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar o diário.')))
  }, [equipeId])

  async function pdf() {
    setBaixando(true)
    setErro(null)
    try {
      await operacaoService.diarioPdf({ equipeId, data: diario?.data })
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível gerar o PDF.'))
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div>
      {erro && <p className="mb-3 text-sm text-red-700">{erro}</p>}
      <div className="rounded border border-[#CFCCC5] bg-papel p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-aco">
          Diário · {diario?.escopo ?? '…'}
        </p>
        <p className="mt-1 font-disp text-2xl">{diario ? fmtData(diario.data) : '…'}</p>
      </div>

      <div className="mt-4">
        <h3 className="mb-2 font-disp text-lg">Serviços do dia</h3>
        <div className="space-y-2">
          {(diario?.frentes ?? []).map((f) => (
            <div key={f.frenteId} className="flex overflow-hidden rounded border border-[#CFCCC5] bg-papel">
              <span className="w-1.5 shrink-0" style={{ background: f.cor }} />
              <div className="flex-1 p-3">
                <p className="font-disp text-[15px]">{f.nome}</p>
                <p className="mt-1 font-mono text-[10px] uppercase text-aco">
                  {f.obraNome} · {f.horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h · {f.pessoas} pessoas
                  {f.quantidade > 0 ? ` · ${f.quantidade} ${f.unidade}` : ''}
                </p>
                {f.semQuantidade && (
                  <span className="mt-2 inline-block rounded border border-ambar/40 px-2 py-0.5 font-mono text-[10px] uppercase text-ambar">
                    sem quantidade
                  </span>
                )}
              </div>
            </div>
          ))}
          {diario && diario.frentes.length === 0 && (
            <p className="text-sm text-aco">Nenhum serviço apontado neste dia.</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded border border-[#CFCCC5] bg-papel p-3">
          <p className="font-mono text-[10px] uppercase text-aco">Equipe</p>
          {(diario?.funcoes ?? []).map((f) => (
            <div key={f.funcao} className="mt-1.5 flex justify-between text-sm">
              <span>{f.funcao}</span>
              <b className="font-mono">{f.quantidade}</b>
            </div>
          ))}
        </div>
        <div className="rounded border border-[#CFCCC5] bg-papel p-3">
          <p className="font-mono text-[10px] uppercase text-aco">Observações</p>
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
        <h3 className="mb-2 font-disp text-lg">Registro fotográfico</h3>
        {diario && diario.fotos.length === 0 ? (
          <p className="rounded border border-dashed border-[#CFCCC5] bg-papel p-4 text-sm text-aco">
            Nenhuma foto anexada hoje. Fotos de avanço entram no PDF do diário e sustentam a medição.
          </p>
        ) : (
          <>
            <GradeFotos fotos={diario?.fotos ?? []} />
            {diario && diario.fotos.length > 0 && (
              <p className="mt-2 text-xs text-aco">
                {diario.fotosAvanco} de {diario.fotos.length} registros marcados como avanço, com quantidade vinculada à
                frente.
              </p>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={pdf}
        disabled={baixando}
        className="mt-4 h-14 w-full rounded bg-ambar font-disp text-lg text-grafite disabled:opacity-50"
      >
        {baixando ? 'Gerando…' : 'EXPORTAR PDF'}
      </button>
    </div>
  )
}
