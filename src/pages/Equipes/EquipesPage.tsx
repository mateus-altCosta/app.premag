import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import type { EquipeDto, UsuarioResumoDto } from '../../app/models/entity/Cadastro.dto'
import { ehEncarregado, podeGerir } from '../../app/services/premag/perfil'
import { loadSession } from '../../app/services/premag/session'
import { operacaoService } from '../../app/services/premag/operacao.service'
import type { ImportacaoResultadoDto } from '../../app/models/entity/Operacao.dto'

const CORES_EQUIPE = ['#F2A900', '#4A5560', '#2E7D5B', '#7B4B94', '#C1272D', '#2D6A9F']

export default function EquipesPage() {
  const navigate = useNavigate()
  const session = loadSession()
  const [equipes, setEquipes] = useState<EquipeDto[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [importacao, setImportacao] = useState<ImportacaoResultadoDto | null>(null)
  const [abrir, setAbrir] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(CORES_EQUIPE[0])
  const [encarregadoId, setEncarregadoId] = useState('')
  const [encarregados, setEncarregados] = useState<UsuarioResumoDto[]>([])
  const gerir = podeGerir(session?.perfil)

  async function recarregar() {
    setEquipes(await cadastroService.equipes())
  }

  useEffect(() => {
    if (ehEncarregado(session?.perfil) && session?.equipeId) {
      navigate(`/equipes/${session.equipeId}`, { replace: true })
      return
    }
    cadastroService
      .equipes()
      .then(setEquipes)
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar as equipes.')))
    if (gerir) {
      cadastroService
        .catalogos()
        .then((c) => setEncarregados(c.encarregados ?? []))
        .catch(() => undefined)
    }
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
                {e.encarregadoNome ? ` · ${e.encarregadoNome}` : ''}
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
        <button
          type="button"
          onClick={() => {
            setNome('')
            setCor(CORES_EQUIPE[0])
            setEncarregadoId('')
            setAbrir(true)
          }}
          className="w-full rounded border border-dashed border-[#B07500] py-3 font-mono text-[11px] uppercase tracking-wider text-[#B07500]"
        >
          + Cadastrar equipe
        </button>
      )}
      {abrir && (
        <Sheet titulo="Cadastrar equipe" onClose={() => setAbrir(false)}>
          <form
            className="space-y-3"
            onSubmit={async (e: FormEvent) => {
              e.preventDefault()
              setEnviando(true)
              setErro(null)
              try {
                await cadastroService.criarEquipe({
                  nome: nome.trim(),
                  cor,
                  encarregadoId: encarregadoId || null,
                })
                setAbrir(false)
                await recarregar()
              } catch (err) {
                setErro(mensagemErro(err, 'Não foi possível cadastrar a equipe.'))
              } finally {
                setEnviando(false)
              }
            }}
          >
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-aco">Nome</span>
              <input
                className="w-full rounded border border-[#CFCCC5] bg-white px-3 py-2"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                maxLength={60}
              />
            </label>
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-aco">Encarregado</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEncarregadoId('')}
                  className={`rounded border px-3 py-1.5 font-mono text-[11px] uppercase ${
                    !encarregadoId ? 'border-ambar bg-ambar text-grafite' : 'border-[#CFCCC5]'
                  }`}
                >
                  Nenhum
                </button>
                {encarregados.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setEncarregadoId(u.id)}
                    className={`rounded border px-3 py-1.5 font-mono text-[11px] uppercase ${
                      encarregadoId === u.id ? 'border-ambar bg-ambar text-grafite' : 'border-[#CFCCC5]'
                    }`}
                  >
                    {u.nome}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-aco">Cor</p>
              <div className="flex flex-wrap gap-2">
                {CORES_EQUIPE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={`h-9 w-9 rounded border ${cor === c ? 'border-ambar ring-2 ring-ambar' : 'border-[#CFCCC5]'}`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded bg-ambar py-3 font-disp text-lg text-grafite disabled:opacity-50"
            >
              {enviando ? 'Salvando…' : 'Cadastrar equipe'}
            </button>
          </form>
        </Sheet>
      )}
      {gerir && (
        <div className="mt-4 rounded border border-[#CFCCC5] bg-papel p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-aco">Importar folha</p>
          <p className="mt-1 text-xs text-aco">
            AFD (REP, registros tipo 3/4) atualiza jornada do dia. CSV:{' '}
            <code>matricula;nome;funcao;equipeNome;custoHora;codigoExterno</code>
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
