import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import Regua from '../../components/Regua'
import type { EquipeDto } from '../../app/models/entity/Cadastro.dto'
import type { TurnoColaboradorDto, TurnoDto } from '../../app/models/entity/Turno.dto'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import { turnoService } from '../../app/services/premag/turno.service'
import { horas, fmtCustoHora, rotuloPonto } from '../../app/services/premag/jornada'
import { loadSession } from '../../app/services/premag/session'
import { podeGerir } from '../../app/services/premag/perfil'
import { estaOnline, onRede } from '../../app/services/premag/rede'

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
  const [folha, setFolha] = useState<'novo' | 'mover' | null>(null)
  const [alvo, setAlvo] = useState<TurnoColaboradorDto | null>(null)
  const [mat, setMat] = useState('')
  const [nome, setNome] = useState('')
  const [funcao, setFuncao] = useState('')
  const [destino, setDestino] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function carregar() {
    if (!id) return
    const [t, eqs] = await Promise.all([turnoService.obter(id), cadastroService.equipes()])
    setTurno(t)
    setEquipes(eqs)
  }

  useEffect(() => {
    carregar().catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar a equipe.')))
    return onRede(() => {
      if (estaOnline()) carregar().catch(() => undefined)
    })
  }, [id])

  const lista = turno?.colaboradores ?? []
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
      })
      setFolha(null)
      setMat('')
      setNome('')
      setFuncao('')
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
        <button
          type="button"
          onClick={() => navigate('/equipes')}
          className="mb-3 font-mono text-[10px] uppercase tracking-wider text-aco"
        >
          ← Voltar para equipes
        </button>
      )}
      <div className="mb-3 rounded border border-[#CFCCC5] bg-papel p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-aco">Situação agora</p>
        <p className="mt-1 font-disp text-xl">{turno?.equipeNome ?? 'Equipe'}</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <div className="font-disp text-3xl">{presentes.length}</div>
            <div className="font-mono text-[10px] uppercase text-aco">presentes</div>
          </div>
          <div>
            <div className={`font-disp text-3xl ${semServico ? 'text-ambar' : ''}`}>{semServico}</div>
            <div className="font-mono text-[10px] uppercase text-aco">sem serviço</div>
          </div>
          <div>
            <div className="font-disp text-3xl">{horas(hhTotal)}</div>
            <div className="font-mono text-[10px] uppercase text-aco">HH apontado</div>
          </div>
        </div>
      </div>

      {erro && <p className="mb-3 text-sm text-red-700">{erro}</p>}

      <div className="space-y-2">
        {lista.map((c) => {
          const presente = estaPresente(c)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => presente && navigate(`/equipes/${id}/colaboradores/${c.id}`)}
              className={`w-full rounded border border-[#CFCCC5] bg-papel px-3 py-3 text-left ${
                presente ? '' : 'opacity-60'
              } ${c.aberto ? 'border-green-700/40' : c.minutosNaoApropriados > 30 && presente ? 'border-ambar' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <span className="mr-2 font-mono text-[11px] text-aco">{c.matricula}</span>
                  <span className="font-disp text-[16px]">{c.nome}</span>
                </div>
                <span
                  className={`shrink-0 font-mono text-[9px] uppercase tracking-wider ${
                    !presente ? 'text-aco' : c.aberto ? 'text-green-800' : 'text-red-800'
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
              {gerir && presente && (
                <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="border border-[#CFCCC5] px-2 py-1 font-mono text-[10px] uppercase"
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
                    className="border border-[#CFCCC5] px-2 py-1 font-mono text-[10px] uppercase text-red-800"
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
          onClick={() => setFolha('novo')}
          className="mt-3 w-full rounded border border-dashed border-[#B07500] py-3 font-mono text-[11px] uppercase tracking-wider text-[#B07500]"
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
            <p className="text-xs text-aco">
              Cadastro avulso: entra no diário, fora do relatório de custo até a folha sincronizar.
            </p>
            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded bg-ambar py-3 font-disp text-lg text-grafite disabled:opacity-50"
            >
              {enviando ? 'Salvando…' : 'Cadastrar'}
            </button>
          </form>
        </Sheet>
      )}

      {folha === 'mover' && alvo && (
        <Sheet titulo={`Mover ${alvo.nome}`} onClose={() => setFolha(null)}>
          <form onSubmit={onMover} className="space-y-3">
            <p className="font-mono text-[10px] uppercase text-aco">Nova equipe</p>
            <div className="flex flex-wrap gap-2">
              {equipes.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setDestino(e.id)}
                  className={`rounded border px-3 py-2 font-mono text-[11px] uppercase ${
                    destino === e.id ? 'border-ambar bg-ambar text-grafite' : 'border-[#CFCCC5]'
                  }`}
                >
                  {e.nome}
                </button>
              ))}
            </div>
            <p className="text-xs text-aco">Os serviços já apontados hoje permanecem na equipe de origem.</p>
            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded bg-ambar py-3 font-disp text-lg text-grafite disabled:opacity-50"
            >
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
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-aco">{label}</span>
      <input
        className="w-full rounded border border-[#CFCCC5] bg-white px-3 py-2 outline-none focus:border-ambar"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  )
}
