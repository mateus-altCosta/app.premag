import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import type { EquipeDto } from '../../app/models/entity/Cadastro.dto'
import { ehEncarregado, podeGerir } from '../../app/services/premag/perfil'
import { loadSession } from '../../app/services/premag/session'
import { operacaoService } from '../../app/services/premag/operacao.service'
import type { ImportacaoResultadoDto } from '../../app/models/entity/Operacao.dto'

export default function EquipesPage() {
  const navigate = useNavigate()
  const session = loadSession()
  const [equipes, setEquipes] = useState<EquipeDto[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [importacao, setImportacao] = useState<ImportacaoResultadoDto | null>(null)
  const gerir = podeGerir(session?.perfil)

  useEffect(() => {
    if (ehEncarregado(session?.perfil) && session?.equipeId) {
      navigate(`/equipes/${session.equipeId}`, { replace: true })
      return
    }
    cadastroService
      .equipes()
      .then(setEquipes)
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar as equipes.')))
  }, [navigate, session?.equipeId, session?.perfil])

  return (
    <div className="space-y-2">
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      {equipes.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => navigate(`/equipes/${e.id}`)}
          className="flex w-full items-stretch overflow-hidden rounded border border-[#CFCCC5] bg-papel text-left"
        >
          <span className="w-1.5 shrink-0" style={{ background: e.cor }} />
          <span className="flex flex-1 items-center justify-between gap-3 px-3 py-3">
            <span>
              <span className="block font-disp text-[17px]">{e.nome}</span>
              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-aco">
                {e.presentes} na equipe
              </span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-aco">Abrir</span>
          </span>
        </button>
      ))}
      {!erro && equipes.length === 0 && (
        <p className="rounded border border-dashed border-[#CFCCC5] bg-papel p-4 text-sm text-aco">
          Nenhuma equipe cadastrada ainda.
        </p>
      )}
      {gerir && (
        <div className="mt-4 rounded border border-[#CFCCC5] bg-papel p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-aco">Importar folha</p>
          <p className="mt-1 text-xs text-aco">
            AFD (REP, registros tipo 3/4) atualiza jornada do dia. CSV:{' '}
            <code>matricula;nome;funcao;equipeNome;custoHora</code>
          </p>
          <label className="mt-3 block">
            <span className="mb-1 block font-mono text-[10px] uppercase text-aco">Arquivo AFD</span>
            <input
              type="file"
              className="w-full text-sm"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setErro(null)
                try {
                  setImportacao(await operacaoService.importarAfd(f))
                } catch (err) {
                  setErro(mensagemErro(err, 'Falha ao importar AFD.'))
                }
                e.target.value = ''
              }}
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block font-mono text-[10px] uppercase text-aco">Colaboradores (CSV)</span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="w-full text-sm"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setErro(null)
                try {
                  setImportacao(await operacaoService.importarColaboradores(f))
                } catch (err) {
                  setErro(mensagemErro(err, 'Falha ao importar CSV.'))
                }
                e.target.value = ''
              }}
            />
          </label>
          {importacao && (
            <p className="mt-3 text-sm">
              Lidos {importacao.lidos} · gravados {importacao.gravados} · ignorados {importacao.ignorados}
              {importacao.avisos[0] ? ` · ${importacao.avisos[0]}` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
