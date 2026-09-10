import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import Regua from '../../components/Regua'
import type { TurnoColaboradorDto, TurnoDto } from '../../app/models/entity/Turno.dto'
import { mensagemErro } from '../../app/services/premag/cadastro.service'
import { turnoService } from '../../app/services/premag/turno.service'
import {
  agoraNaJornada,
  clienteUuid,
  formatarHora,
  horas,
  paraMinutos,
  fmtCustoHora,
  rotuloPonto,
} from '../../app/services/premag/jornada'
import { estaOnline, onRede } from '../../app/services/premag/rede'
import FotoSheet from '../../components/FotoSheet'
import GradeFotos from '../../components/GradeFotos'
import { operacaoService } from '../../app/services/premag/operacao.service'
import type { FotoDto } from '../../app/models/entity/Operacao.dto'

type Folha = 'iniciar' | 'encerrar' | 'foto' | null

export default function ColaboradorPage() {
  const { id, colabId } = useParams<{ id: string; colabId: string }>()
  const navigate = useNavigate()
  const [turno, setTurno] = useState<TurnoDto | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [folha, setFolha] = useState<Folha>(null)
  const [enviando, setEnviando] = useState(false)
  const [obraId, setObraId] = useState('')
  const [frenteId, setFrenteId] = useState('')
  const [horaIni, setHoraIni] = useState(0)
  const [horaFim, setHoraFim] = useState(0)
  const [motivoId, setMotivoId] = useState('')
  const [qtd, setQtd] = useState('')
  const [obs, setObs] = useState('')
  const [fotos, setFotos] = useState<FotoDto[]>([])

  async function carregar() {
    if (!id) return
    const t = await turnoService.obter(id)
    setTurno(t)
    if (colabId) {
      operacaoService.fotos({ colaboradorId: colabId }).then(setFotos).catch(() => undefined)
    }
  }

  useEffect(() => {
    carregar().catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar o colaborador.')))
    return onRede(() => {
      if (estaOnline()) carregar().catch(() => undefined)
    })
  }, [id, colabId])

  const colab: TurnoColaboradorDto | undefined = turno?.colaboradores.find((c) => c.id === colabId)
  const aberto = colab?.aberto
  const agora = turno ? agoraNaJornada(turno.jornadaInicio, turno.jornadaFim) : 0

  const origemGap = useMemo(() => {
    if (!turno || !colab) return 0
    const fechados = colab.apontamentos.filter((a) => a.horaFim)
    if (fechados.length) {
      return Math.max(...fechados.map((a) => paraMinutos(a.horaFim!)))
    }
    return paraMinutos(turno.jornadaInicio)
  }, [turno, colab])

  const gap = useMemo(() => {
    if (!turno) return 0
    const bruto = Math.max(0, horaIni - origemGap)
    const ov = Math.max(
      0,
      Math.min(horaIni, paraMinutos(turno.intervaloFim)) - Math.max(origemGap, paraMinutos(turno.intervaloInicio)),
    )
    return Math.max(0, bruto - ov)
  }, [turno, horaIni, origemGap])

  const frentesObra = (turno?.frentes ?? []).filter((f) => f.obraId === obraId)

  function abrirIniciar() {
    if (!turno) return
    const ult = colab?.apontamentos.filter((a) => a.horaFim).sort((a, b) => paraMinutos(b.horaFim!) - paraMinutos(a.horaFim!))[0]
    setHoraIni(ult ? paraMinutos(ult.horaFim!) : agora)
    if (!ult) setHoraIni(agora)
    setObraId('')
    setFrenteId('')
    setMotivoId('')
    setObs('')
    setFolha('iniciar')
  }

  function abrirEncerrar() {
    if (!aberto || !turno) return
    setHoraFim(agora)
    setQtd('')
    setFolha('encerrar')
  }

  function ajustar(atual: number, delta: number, minimo: number) {
    if (!turno) return atual
    return Math.max(minimo, Math.min(agora, atual + delta))
  }

  async function onIniciar(e: FormEvent) {
    e.preventDefault()
    if (!colab || !frenteId || !id) return
    setEnviando(true)
    setErro(null)
    try {
      await turnoService.iniciar(id, {
        colaboradorId: colab.id,
        frenteId,
        horaInicio: formatarHora(horaIni),
        motivoParadaId: gap > 10 ? motivoId : null,
        observacao: obs || undefined,
        clienteUuid: clienteUuid(),
      })
      setFolha(null)
      await carregar()
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível iniciar o serviço.'))
    } finally {
      setEnviando(false)
    }
  }

  async function onEncerrar(e: FormEvent, iniciarNovo: boolean) {
    e.preventDefault()
    if (!aberto || !id) return
    setEnviando(true)
    setErro(null)
    try {
      const quantidade = Number(String(qtd).replace(',', '.')) || 0
      const resultado = await turnoService.encerrar(
        id,
        aberto.id,
        {
          horaFim: formatarHora(horaFim),
          clienteUuid: clienteUuid(),
          producao: quantidade > 0 ? { clienteUuid: clienteUuid(), quantidade } : undefined,
        },
        aberto.clienteUuid,
        !!aberto.pendente,
      )
      setFolha(null)
      setAviso(
        resultado.avisos?.includes('QUANTIDADE_JA_LANCADA_HOJE')
          ? 'Já havia quantidade lançada nesta frente hoje. Confira se não está repetindo o número.'
          : null,
      )
      await carregar()
      if (iniciarNovo) abrirIniciar()
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível encerrar o serviço.'))
    } finally {
      setEnviando(false)
    }
  }

  if (!turno || !colab) {
    return (
      <div>
        <button type="button" onClick={() => navigate(`/equipes/${id}`)} className="mb-3 font-mono text-[10px] uppercase text-aco">
          ← Voltar para a equipe
        </button>
        {erro && <p className="text-sm text-red-700">{erro}</p>}
        {!erro && <p className="text-sm text-aco">Carregando…</p>}
      </div>
    )
  }

  const podeIniciar = !!frenteId && (gap <= 10 || !!motivoId)

  return (
    <div className={aberto ? 'pb-16' : undefined}>
      <button type="button" onClick={() => navigate(`/equipes/${id}`)} className="mb-3 font-mono text-[10px] uppercase tracking-wider text-aco">
        ← Voltar para a equipe
      </button>

      <div className="rounded border border-[#CFCCC5] bg-papel p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-disp text-[18px]">{colab.nome}</span>
          <span className="font-mono text-[11px] text-aco">{colab.matricula}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded border border-[#CFCCC5] px-2 py-0.5 font-mono text-[10px] uppercase text-aco">{colab.funcao}</span>
          {colab.custoHora != null && (
            <span className="rounded border border-[#CFCCC5] px-2 py-0.5 font-mono text-[10px] uppercase text-aco">
              {fmtCustoHora(colab.custoHora)}
            </span>
          )}
          <span className="rounded border border-[#CFCCC5] px-2 py-0.5 font-mono text-[10px] uppercase text-aco">
            {horas(colab.minutosTrabalhados)}h apontadas
          </span>
          {rotuloPonto(colab.jornadaEntrada, colab.jornadaSaida) && (
            <span className="rounded border px-2 py-0.5 font-mono text-[10px] uppercase" style={{ color: '#2D6A9F', borderColor: 'rgba(45,106,159,.3)' }}>
              {rotuloPonto(colab.jornadaEntrada, colab.jornadaSaida)}
              {!colab.jornadaNaoVerificada ? ` · ${horas(colab.minutosApurados)}h` : ''}
            </span>
          )}
        </div>
        <div className="mt-3">
          <Regua
            apontamentos={colab.apontamentos}
            jornadaInicio={turno.jornadaInicio}
            jornadaFim={turno.jornadaFim}
            intervaloInicio={turno.intervaloInicio}
            intervaloFim={turno.intervaloFim}
          />
        </div>
      </div>

      {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}
      {aviso && (
        <p className="mt-3 rounded border border-ambar/60 bg-ambar/10 p-2.5 text-xs leading-5 text-grafite">{aviso}</p>
      )}

      {aberto ? (
        <div className="mt-3 rounded border border-green-700/40 bg-papel p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-green-800">Serviço em andamento</p>
          {aberto.pendente && (
            <p className="mt-1 font-mono text-[10px] uppercase text-ambar">Na fila — envia quando a rede voltar</p>
          )}
          <p className="mt-1 font-disp text-xl leading-tight">{aberto.frenteNome}</p>
          <p className="text-sm text-aco">{aberto.obraNome}</p>
          <div className="mt-3 flex justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase text-aco">Início</p>
              <p className="font-disp text-2xl">{aberto.horaInicio}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase text-aco">Decorrido</p>
              <p className="font-disp text-2xl">
                {horas(Math.max(0, agora - paraMinutos(aberto.horaInicio)))}h
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={abrirEncerrar}
            className="mt-3 h-14 w-full rounded bg-grafite font-disp text-lg text-papel"
          >
            ENCERRAR SERVIÇO
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded border border-dashed border-[#CFCCC5] bg-papel p-4 text-sm text-aco">
          Sem serviço em curso.
          {colab.minutosNaoApropriados > 10 && (
            <>
              {' '}
              <b>{horas(colab.minutosNaoApropriados)}h</b> do dia ainda não foram apropriadas.
            </>
          )}
          <button
            type="button"
            onClick={abrirIniciar}
            className="mt-3 h-14 w-full rounded bg-ambar font-disp text-lg text-grafite"
          >
            INICIAR SERVIÇO
          </button>
        </div>
      )}

      <div className="mt-5">
        <h3 className="mb-2 font-disp text-lg">Serviços de hoje</h3>
        <div className="space-y-2">
          {colab.apontamentos.length === 0 && <p className="text-sm text-aco">Nada apontado ainda.</p>}
          {colab.apontamentos.map((a) => (
            <div key={a.id} className="flex overflow-hidden rounded border border-[#CFCCC5] bg-papel">
              <span className="w-1.5 shrink-0" style={{ background: a.frenteCor }} />
              <div className="flex-1 p-3">
                <div className="flex justify-between gap-2">
                  <span className="font-disp text-[15px]">{a.frenteNome}</span>
                  <span className="font-mono text-[11px] text-aco">
                    {a.horaInicio}–{a.horaFim ?? 'agora'}
                  </span>
                </div>
                <div className="mt-1 flex justify-between font-mono text-[10px] uppercase text-aco">
                  <span>{a.obraNome}</span>
                  <span>
                    {a.minutosEfetivos != null
                      ? `${horas(a.minutosEfetivos)}h`
                      : `${horas(Math.max(0, agora - paraMinutos(a.horaInicio)))}h`}
                  </span>
                </div>
                {a.motivoParadaNome && (
                  <p className="mt-1 font-mono text-[10px] uppercase text-red-800">{a.motivoParadaNome}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {fotos.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 font-disp text-lg">Registro fotográfico</h3>
          <GradeFotos fotos={fotos} />
        </div>
      )}

      {aberto && (
        <button
          type="button"
          onClick={() => setFolha('foto')}
          className="fixed bottom-20 left-1/2 z-30 w-[calc(100%-2rem)] max-w-[448px] -translate-x-1/2 rounded bg-grafite py-3 font-disp text-lg text-papel"
        >
          REGISTRAR FOTO
        </button>
      )}

      {folha === 'iniciar' && (
        <Sheet titulo="Iniciar serviço" onClose={() => setFolha(null)}>
          <form onSubmit={onIniciar} className="space-y-4">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-aco">Obra</p>
              <div className="space-y-1">
                {turno.obras.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setObraId(o.id)
                      setFrenteId('')
                    }}
                    className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left ${
                      obraId === o.id ? 'border-ambar' : 'border-[#CFCCC5]'
                    }`}
                  >
                    <span>
                      <span className="block font-disp">{o.nome}</span>
                      <span className="font-mono text-[10px] uppercase text-aco">{o.cliente}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {obraId && (
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-aco">Frente de serviço</p>
                <div className="space-y-1">
                  {frentesObra.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFrenteId(f.id)}
                      className={`flex w-full items-center gap-2 rounded border px-3 py-2 text-left ${
                        frenteId === f.id ? 'border-ambar' : 'border-[#CFCCC5]'
                      }`}
                    >
                      <span className="h-8 w-1 shrink-0 rounded" style={{ background: f.cor }} />
                      <span className="min-w-0">
                        <span className="block font-disp">{f.nome}</span>
                        <span className="font-mono text-[10px] uppercase text-aco">
                          {f.quantidadeConcluida}/{f.quantidadePrevista} {f.unidade}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-aco">Horário de início</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="h-14 w-14 rounded border border-[#CFCCC5] font-disp text-2xl"
                  onClick={() => setHoraIni((h) => ajustar(h, -5, origemGap))}
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <div className="font-disp text-3xl">{formatarHora(horaIni)}</div>
                  <div className="font-mono text-[10px] uppercase text-aco">ajuste de 5 em 5 min</div>
                </div>
                <button
                  type="button"
                  className="h-14 w-14 rounded border border-[#CFCCC5] font-disp text-2xl"
                  onClick={() => setHoraIni((h) => ajustar(h, 5, origemGap))}
                >
                  +
                </button>
              </div>
            </div>
            {gap > 10 && (
              <div className="rounded border border-ambar/50 bg-ambar/10 p-3 text-sm">
                <b>{gap} min sem apropriação</b> desde {formatarHora(origemGap)}. Informe o motivo — esse tempo entra
                como parada.
                <div className="mt-2 flex flex-wrap gap-2">
                  {turno.motivosParada.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMotivoId(m.id)}
                      className={`rounded border px-3 py-1.5 font-mono text-[11px] uppercase ${
                        motivoId === m.id ? 'border-ambar bg-ambar text-grafite' : 'border-[#CFCCC5]'
                      }`}
                    >
                      {m.nome}
                    </button>
                  ))}
                </div>
                {turno.motivosParada.find((m) => m.id === motivoId)?.exigeObservacao && (
                  <input
                    className="mt-2 w-full rounded border border-[#CFCCC5] px-3 py-2"
                    placeholder="Observação"
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                  />
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={!podeIniciar || enviando}
              className="h-14 w-full rounded bg-ambar font-disp text-lg text-grafite disabled:opacity-40"
            >
              {enviando ? 'Salvando…' : 'INICIAR'}
            </button>
          </form>
        </Sheet>
      )}

      {folha === 'encerrar' && aberto && (
        <Sheet titulo="Encerrar serviço" onClose={() => setFolha(null)}>
          <form className="space-y-4">
            <div className="rounded border border-[#CFCCC5] p-3">
              <p className="font-disp">{aberto.frenteNome}</p>
              <p className="font-mono text-[10px] uppercase text-aco">
                {aberto.obraNome} · início {aberto.horaInicio}
              </p>
            </div>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-aco">Horário de término</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="h-14 w-14 rounded border border-[#CFCCC5] font-disp text-2xl"
                  onClick={() => setHoraFim((h) => ajustar(h, -5, paraMinutos(aberto.horaInicio) + 5))}
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <div className="font-disp text-3xl">{formatarHora(horaFim)}</div>
                  <div className="font-mono text-[10px] uppercase text-aco">
                    {horas(Math.max(0, horaFim - paraMinutos(aberto.horaInicio)))} h de serviço
                  </div>
                </div>
                <button
                  type="button"
                  className="h-14 w-14 rounded border border-[#CFCCC5] font-disp text-2xl"
                  onClick={() => setHoraFim((h) => ajustar(h, 5, paraMinutos(aberto.horaInicio) + 5))}
                >
                  +
                </button>
              </div>
            </div>
            {!aberto.frenteIndireta && (
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-aco">
                  Quantidade concluída na frente ({aberto.unidade})
                </p>
                <input
                  className="w-full rounded border border-[#CFCCC5] px-3 py-3"
                  inputMode="decimal"
                  value={qtd}
                  onChange={(e) => setQtd(e.target.value)}
                  placeholder="0"
                />
                <p className="mt-2 text-xs text-aco">
                  Quantidade é da <b>frente</b>, não da pessoa. Lance uma vez por frente no encerramento do último
                  serviço do dia.
                </p>
              </div>
            )}
            <button
              type="button"
              disabled={enviando}
              onClick={(e) => onEncerrar(e, false)}
              className="h-14 w-full rounded bg-ambar font-disp text-lg text-grafite disabled:opacity-40"
            >
              {enviando ? 'Salvando…' : 'ENCERRAR'}
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={(e) => onEncerrar(e, true)}
              className="h-12 w-full rounded border border-[#CFCCC5] font-mono text-[11px] uppercase"
            >
              Encerrar e iniciar novo serviço
            </button>
          </form>
        </Sheet>
      )}

      {folha === 'foto' && turno && (
        <FotoSheet
          frentes={turno.frentes}
          colaboradorId={colabId}
          apontamentoId={aberto?.id}
          frenteIdInicial={aberto?.frenteId}
          onClose={() => setFolha(null)}
          onOk={() => {
            setFolha(null)
            carregar().catch(() => undefined)
          }}
        />
      )}
    </div>
  )
}
