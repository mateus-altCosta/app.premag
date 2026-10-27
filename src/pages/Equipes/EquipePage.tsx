import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import Regua from '../../components/Regua'
import { AlertMsg, Chip } from '../../components/ui'
import type { EquipeDto, UsuarioResumoDto } from '../../app/models/entity/Cadastro.dto'
import type { TurnoColaboradorDto, TurnoDto } from '../../app/models/entity/Turno.dto'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import { turnoService } from '../../app/services/premag/turno.service'
import { horas, fmtCustoHora, rotuloPonto } from '../../app/services/premag/jornada'
import { loadSession } from '../../app/services/premag/session'
import { podeGerir } from '../../app/services/premag/perfil'
import { estaOnline, onRede } from '../../app/services/premag/rede'

const CORES_EQUIPE = ['#F2A900', '#4A5560', '#2E7D5B', '#7B4B94', '#C1272D', '#2D6A9F']

function parseCusto(texto: string): number | undefined {
  const t = texto.trim().replace(/\s/g, '').replace(',', '.')
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function estaPresente(c: TurnoColaboradorDto) {
  return c.ativo && (c.situacao === 'Presente' || c.situacao === 0)
}

export default function EquipePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const gerir = podeGerir(loadSession()?.perfil)
  const [turno, setTurno] = useState<TurnoDto | null>(null)
  const [equipes, setEquipes] = useState<EquipeDto[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [folha, setFolha] = useState<'novo' | 'mover' | 'editar' | 'equipe' | null>(null)
  const [alvo, setAlvo] = useState<TurnoColaboradorDto | null>(null)
  const [mat, setMat] = useState('')
  const [nome, setNome] = useState('')
  const [funcao, setFuncao] = useState('')
  const [custo, setCusto] = useState('')
  const [eqNome, setEqNome] = useState('')
  const [eqCor, setEqCor] = useState(CORES_EQUIPE[1])
  const [eqEnc, setEqEnc] = useState('')
  const [encarregados, setEncarregados] = useState<UsuarioResumoDto[]>([])
  const [codigo, setCodigo] = useState('')
  const [destino, setDestino] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function carregar() {
    if (!id) return
    const [t, eqs, cat] = await Promise.all([
      turnoService.obter(id),
      cadastroService.equipes(),
      gerir ? cadastroService.catalogos() : Promise.resolve(null),
    ])
    setTurno(t)
    setEquipes(eqs)
    if (cat) setEncarregados(cat.encarregados ?? [])
  }

  useEffect(() => {
    carregar().catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar a equipe.')))
    return onRede(() => {
      if (estaOnline()) carregar().catch(() => undefined)
    })
  }, [id])

  const lista = (turno?.colaboradores ?? []).filter((c) => c.ativo)
  const presentes = lista.filter(estaPresente)
  const semServico = presentes.filter((c) => !c.aberto).length
  const hhTotal = presentes.reduce((t, c) => t + c.minutosTrabalhados, 0)

  async function onNovo(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setEnviando(true)
    setErro(null)
    try {
      await cadastroService.criarColaborador({
        matricula: mat.trim(),
        nome: nome.trim(),
        funcao: funcao.trim() || '—',
        equipeId: id,
        custoHora: parseCusto(custo) ?? null,
        codigoExterno: codigo.trim() || null,
      })
      setFolha(null)
      setMat('')
      setNome('')
      setFuncao('')
      setCusto('')
      setCodigo('')
      await carregar()
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível cadastrar.'))
    } finally {
      setEnviando(false)
    }
  }

  async function onMover(e: FormEvent) {
    e.preventDefault()
    if (!alvo || !destino) return
    setEnviando(true)
    setErro(null)
    try {
      await cadastroService.transferir(alvo.id, destino)
      setFolha(null)
      setAlvo(null)
      await carregar()
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível transferir.'))
    } finally {
      setEnviando(false)
    }
  }

  async function onEditar(e: FormEvent) {
    e.preventDefault()
    if (!alvo) return
    setEnviando(true)
    setErro(null)
    try {
      await cadastroService.atualizarColaborador(alvo.id, {
        nome: nome.trim(),
        funcao: funcao.trim() || '—',
        custoHora: parseCusto(custo) ?? null,
        codigoExterno: codigo.trim() || null,
      })
      setFolha(null)
      setAlvo(null)
      await carregar()
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível alterar o funcionário.'))
    } finally {
      setEnviando(false)
    }
  }

  async function excluir(c: TurnoColaboradorDto) {
    if (!confirm(`Excluir ${c.nome} da equipe? O histórico de apontamento permanece.`)) return
    try {
      await cadastroService.excluirColaborador(c.id)
      await carregar()
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível excluir.'))
    }
  }

  return (
    <div>
      {gerir && (
        <button type="button" onClick={() => navigate('/equipes')} className="link-back">
          ← Voltar para equipes
        </button>
      )}
      <div className="mb-3 card-pad">
        <p className="kicker">Situação agora</p>
        <p className="mt-1 font-disp text-[1.45rem] tracking-wide">{turno?.equipeNome ?? 'Equipe'}</p>
        {equipes.find((e) => e.id === id)?.encarregadoNome && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-aco">
            Encarregado · {equipes.find((e) => e.id === id)?.encarregadoNome}
          </p>
        )}
        {gerir && (
          <button
            type="button"
            className="mt-2 btn-link"
            onClick={() => {
              const atual = equipes.find((e) => e.id === id)
              setEqNome(atual?.nome ?? turno?.equipeNome ?? '')
              setEqCor(atual?.cor ?? CORES_EQUIPE[1])
              setEqEnc(atual?.encarregadoId ?? '')
              setFolha('equipe')
            }}
          >
            Alterar equipe
          </button>
        )}
        {gerir && (
          <button
            type="button"
            className="mt-2 ml-3 font-mono text-[10px] uppercase tracking-wider text-alerta"
            onClick={async () => {
              if (!id) return
              const nomeEq = turno?.equipeNome ?? 'esta equipe'
              if (
                !confirm(
                  `Encerrar “${nomeEq}”? Ela some da lista. Apontamentos e fotos já feitos continuam no histórico.`,
                )
              )
                return
              try {
                await cadastroService.inativarEquipe(id)
                navigate('/equipes')
              } catch (err) {
                setErro(mensagemErro(err, 'Não foi possível encerrar a equipe.'))
              }
            }}
          >
            Encerrar equipe
          </button>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-concreto/80 px-2 py-2.5 text-center">
            <div className="metric-value text-[1.55rem]">{presentes.length}</div>
            <div className="metric-label">presentes</div>
          </div>
          <div className="rounded-xl bg-concreto/80 px-2 py-2.5 text-center">
            <div className={`metric-value text-[1.55rem] ${semServico ? 'text-ambar' : ''}`}>{semServico}</div>
            <div className="metric-label">sem serviço</div>
          </div>
          <div className="rounded-xl bg-concreto/80 px-2 py-2.5 text-center">
            <div className="metric-value text-[1.55rem]">{horas(hhTotal)}</div>
            <div className="metric-label">HH apontado</div>
          </div>
        </div>
      </div>

      {erro && <AlertMsg>{erro}</AlertMsg>}

      <div className="space-y-2">
        {lista.map((c) => {
          const presente = estaPresente(c)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => presente && navigate(`/equipes/${id}/colaboradores/${c.id}`)}
              className={`card w-full px-3.5 py-3.5 text-left transition ${
                presente ? '' : 'opacity-55'
              } ${c.aberto ? 'border-ok/35 ring-1 ring-ok/15' : c.minutosNaoApropriados > 30 && presente ? 'border-ambar' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <span className="mr-2 font-mono text-[11px] text-aco">{c.matricula}</span>
                  <span className="font-disp text-[16px]">{c.nome}</span>
                </div>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                    !presente ? 'bg-concreto text-aco' : c.aberto ? 'bg-emerald-50 text-ok' : 'bg-red-50 text-alerta'
                  }`}
                >
                  {!presente ? String(c.situacao).toUpperCase() : c.aberto ? 'Em serviço' : 'Parado'}
                </span>
              </div>
              <p className="mt-1 text-sm text-aco">
                {c.aberto ? `${c.aberto.frenteNome} · desde ${c.aberto.horaInicio}` : presente ? 'nenhum serviço em curso' : c.funcao}
              </p>
              {rotuloPonto(c.jornadaEntrada, c.jornadaSaida) && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#2D6A9F]">
                  {rotuloPonto(c.jornadaEntrada, c.jornadaSaida)}
                  {!c.jornadaNaoVerificada ? ` · ${horas(c.minutosApurados)}h apuradas` : ''}
                </p>
              )}
              {presente && turno && (
                <div className="mt-2">
                  <Regua
                    apontamentos={c.apontamentos}
                    jornadaInicio={turno.jornadaInicio}
                    jornadaFim={turno.jornadaFim}
                    intervaloInicio={turno.intervaloInicio}
                    intervaloFim={turno.intervaloFim}
                  />
                </div>
              )}
              <div className="mt-2 flex justify-between font-mono text-[10px] uppercase text-aco">
                <span>
                  {c.funcao}
                  {c.custoHora != null ? ` · ${fmtCustoHora(c.custoHora)}` : ''}
                </span>
                <span>{horas(c.minutosTrabalhados)}h apontadas</span>
              </div>
              {gerir && (
                <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setAlvo(c)
                      setNome(c.nome)
                      setFuncao(c.funcao)
                      setCusto(c.custoHora != null ? String(c.custoHora).replace('.', ',') : '')
                      setCodigo(c.codigoExterno ?? '')
                      setFolha('editar')
                    }}
                  >
                    Nome e função
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setAlvo(c)
                      setDestino(id ?? '')
                      setFolha('mover')
                    }}
                  >
                    Movimentar
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-alerta"
                    onClick={() => excluir(c)}
                  >
                    Excluir
                  </button>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {gerir && (
        <button
          type="button"
          onClick={() => {
            setCusto('')
            setCodigo('')
            setFolha('novo')
          }}
          className="btn-dashed mt-3"
        >
          + Cadastrar funcionário
        </button>
      )}

      {folha === 'novo' && (
        <Sheet titulo="Cadastrar funcionário" onClose={() => setFolha(null)}>
          <form onSubmit={onNovo} className="space-y-3">
            <Campo label="Matrícula" value={mat} onChange={setMat} required />
            <Campo label="Nome" value={nome} onChange={setNome} required />
            <Campo label="Função" value={funcao} onChange={setFuncao} />
            <Campo label="Código externo" value={codigo} onChange={setCodigo} />
            <Campo label="Valor da hora (R$)" value={custo} onChange={setCusto} />
            <p className="text-xs text-aco">
              Código externo é o documento da folha (mesmo da coluna do CSV). Sem valor da hora, o funcionário entra
              no diário e fica fora do relatório de custo.
            </p>
            <button type="submit" disabled={enviando} className="btn-primary">
              {enviando ? 'Salvando…' : 'Cadastrar'}
            </button>
          </form>
        </Sheet>
      )}

      {folha === 'editar' && alvo && (
        <Sheet titulo={`Nome e função — ${alvo.nome}`} onClose={() => setFolha(null)}>
          <form onSubmit={onEditar} className="space-y-3">
            <Campo label="Nome" value={nome} onChange={setNome} required />
            <Campo label="Função" value={funcao} onChange={setFuncao} />
            <Campo label="Código externo" value={codigo} onChange={setCodigo} />
            <Campo label="Valor da hora (R$)" value={custo} onChange={setCusto} />
            <button type="submit" disabled={enviando} className="btn-primary">
              {enviando ? 'Salvando…' : 'Salvar'}
            </button>
          </form>
        </Sheet>
      )}

      {folha === 'equipe' && (
        <Sheet titulo="Alterar equipe" onClose={() => setFolha(null)}>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!id) return
              setEnviando(true)
              setErro(null)
              try {
                await cadastroService.atualizarEquipe(id, {
                  nome: eqNome.trim(),
                  cor: eqCor,
                  encarregadoId: eqEnc || null,
                })
                setFolha(null)
                await carregar()
              } catch (err) {
                setErro(mensagemErro(err, 'Não foi possível alterar a equipe.'))
              } finally {
                setEnviando(false)
              }
            }}
          >
            <Campo label="Nome" value={eqNome} onChange={setEqNome} required />
            <div>
              <p className="label">Encarregado</p>
              <div className="flex flex-wrap gap-2">
                <Chip ativo={!eqEnc} onClick={() => setEqEnc('')}>
                  Nenhum
                </Chip>
                {encarregados.map((u) => (
                  <Chip key={u.id} ativo={eqEnc === u.id} onClick={() => setEqEnc(u.id)}>
                    {u.nome}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="label">Cor</p>
              <div className="flex flex-wrap gap-2">
                {CORES_EQUIPE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEqCor(c)}
                    className={`h-9 w-9 rounded-lg border ${eqCor.toUpperCase() === c ? 'border-grafite ring-2 ring-ambar' : 'border-linha'}`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <button type="submit" disabled={enviando} className="btn-primary">
              {enviando ? 'Salvando…' : 'Salvar equipe'}
            </button>
          </form>
        </Sheet>
      )}

      {folha === 'mover' && alvo && (
        <Sheet titulo={`Mover ${alvo.nome}`} onClose={() => setFolha(null)}>
          <form onSubmit={onMover} className="space-y-3">
            <p className="kicker">Nova equipe</p>
            <div className="flex flex-wrap gap-2">
              {equipes.map((e) => (
                <Chip key={e.id} ativo={destino === e.id} onClick={() => setDestino(e.id)}>
                  {e.nome}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-aco">Os serviços já apontados hoje permanecem na equipe de origem.</p>
            <button type="submit" disabled={enviando} className="btn-primary">
              {enviando ? 'Salvando…' : 'Confirmar transferência'}
            </button>
          </form>
        </Sheet>
      )}
    </div>
  )
}

function Campo({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  )
}
