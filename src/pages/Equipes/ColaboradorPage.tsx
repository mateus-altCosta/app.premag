import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import Regua from '../../components/Regua'
import type { TurnoColaboradorDto, TurnoDto } from '../../app/models/entity/Turno.dto'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import { turnoService, ajustarApontamento, anularApontamento } from '../../app/services/premag/turno.service'
import { loadSession } from '../../app/services/premag/session'
import { podeGerir } from '../../app/services/premag/perfil'
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

type Folha = 'iniciar' | 'encerrar' | 'foto' | 'ajustar' | 'editar' | null

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
  const [ajusteId, setAjusteId] = useState<string | null>(null)
  const [nomeEd, setNomeEd] = useState('')
  const [funcaoEd, setFuncaoEd] = useState('')
  const [custoEd, setCustoEd] = useState('')
  const [codigoEd, setCodigoEd] = useState('')
  const gerir = podeGerir(loadSession()?.perfil)

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
    if (colab.jornadaEntrada) return paraMinutos(colab.jornadaEntrada)
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
        <button type="button" onClick={() => navigate(`/equipes/${id}`)} className="link-back">
          ← Voltar para a equipe
        </button>
        {erro && <p className="alert alert-erro">{erro}</p>}
        {!erro && <p className="text-sm text-aco">Carregando…</p>}
      </div>
    )
  }

  const podeIniciar = !!frenteId && (gap <= 10 || !!motivoId || obs.trim().length >= 3)

  return (
    <div className={aberto ? 'pb-16' : undefined}>
      <button type="button" onClick={() => navigate(`/equipes/${id}`)} className="link-back">
        ← Voltar para a equipe
      </button>

      <div className="card p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-disp text-[18px]">{colab.nome}</span>
          <span className="font-mono text-[11px] text-aco">{colab.matricula}</span>
        </div>
        {gerir && (
          <button
            type="button"
            className="btn-link mt-2"
            onClick={() => {
              setNomeEd(colab.nome)
              setFuncaoEd(colab.funcao)
              setCustoEd(colab.custoHora != null ? String(colab.custoHora).replace('.', ',') : '')
              setCodigoEd(colab.codigoExterno ?? '')
              setFolha('editar')
            }}
          >
            Nome e função
          </button>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="badge">{colab.funcao}</span>
          {colab.custoHora != null && (
            <span className="badge">
              {fmtCustoHora(colab.custoHora)}
            </span>
          )}
          {colab.codigoExterno && (
            <span className="badge">
              {colab.codigoExterno}
            </span>
          )}
          <span className="badge">
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

      {erro && <p className="alert alert-erro mt-3">{erro}</p>}
      {aviso && (
        <p className="alert alert-aviso mt-3 text-xs">{aviso}</p>
      )}

      {aberto ? (
        <div className="card mt-3 border-ok/35 p-3.5 ring-1 ring-ok/15">
          <p className="kicker text-ok">Serviço em andamento</p>
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
            className="btn-dark mt-3 h-14"
          >
            Encerrar serviço
          </button>
        </div>
      ) : (
        <div className="empty mt-3">
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
            className="btn-primary mt-3 h-14"
          >
            Iniciar serviço
          </button>
        </div>
      )}

      <div className="mt-5">
        <h3 className="mb-2 font-disp text-lg">Serviços de hoje</h3>
        <div className="space-y-2">
          {colab.apontamentos.length === 0 && <p className="text-sm text-aco">Nada apontado ainda.</p>}
          {colab.apontamentos.map((a) => (
            <div key={a.id} className="card-row">
              <span className="card-accent" style={{ background: a.frenteCor }} />
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
                {gerir && !a.pendente && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => {
                        setAjusteId(a.id)
                        setHoraIni(paraMinutos(a.horaInicio))
                        setHoraFim(a.horaFim ? paraMinutos(a.horaFim) : agora)
                        setFrenteId(a.frenteId)
                        setObraId(a.obraId)
                        setFolha('ajustar')
                      }}
                    >
                      Corrigir
                    </button>
                    <button
                      type="button"
                      className="font-mono text-[10px] uppercase text-alerta"
                      onClick={async () => {
                        const motivo = window.prompt('Motivo da anulação')
                        if (!motivo || motivo.trim().length < 3) return
                        try {
                          await anularApontamento(a.id, motivo.trim())
                          await carregar()
                        } catch (err) {
                          setErro(mensagemErro(err, 'Não foi possível anular.'))
                        }
                      }}
                    >
                      Anular
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {fotos.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 font-disp text-lg">Registro fotográfico</h3>
          <GradeFotos
            fotos={fotos}
            podeExcluir={gerir}
            onExcluida={() => carregar().catch(() => undefined)}
          />
        </div>
      )}

      {aberto && (
        <button
          type="button"
          onClick={() => setFolha('foto')}
          className="btn-dark sticky bottom-3 z-30 mt-4 shadow-lg"
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
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                      obraId === o.id ? 'border-grafite bg-concreto' : 'border-linha'
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
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left ${
                        frenteId === f.id ? 'border-grafite bg-concreto' : 'border-linha'
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
                  className="h-14 w-14 rounded-xl border border-linha bg-white font-disp text-2xl"
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
                  className="h-14 w-14 rounded-xl border border-linha bg-white font-disp text-2xl"
                  onClick={() => setHoraIni((h) => ajustar(h, 5, origemGap))}
                >
                  +
                </button>
              </div>
            </div>
            {gap > 10 && (
              <div className="alert alert-aviso text-sm">
                <b>{gap} min sem apropriação</b> desde {formatarHora(origemGap)}. Informe o motivo — esse tempo entra
                como parada.
                <div className="mt-2 flex flex-wrap gap-2">
                  {turno.motivosParada.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMotivoId(m.id)}
                      className={`chip ${motivoId === m.id ? 'chip-on' : ''}`}
                    >
                      {m.nome}
                    </button>
                  ))}
                </div>
                {(turno.motivosParada.find((m) => m.id === motivoId)?.exigeObservacao || !motivoId) && (
                  <input
                    className="input mt-2"
                    placeholder="Justificativa das horas"
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                  />
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={!podeIniciar || enviando}
              className="btn-primary h-14"
            >
              {enviando ? 'Salvando…' : 'INICIAR'}
            </button>
          </form>
        </Sheet>
      )}

      {folha === 'encerrar' && aberto && (
        <Sheet titulo="Encerrar serviço" onClose={() => setFolha(null)}>
          <form className="space-y-4">
            <div className="card p-3.5">
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
                  className="h-14 w-14 rounded-xl border border-linha bg-white font-disp text-2xl"
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
                  className="h-14 w-14 rounded-xl border border-linha bg-white font-disp text-2xl"
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
                  className="input"
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
              className="btn-primary h-14"
            >
              {enviando ? 'Salvando…' : 'ENCERRAR'}
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={(e) => onEncerrar(e, true)}
              className="btn-ghost w-full py-3"
            >
              Encerrar e iniciar novo serviço
            </button>
          </form>
        </Sheet>
      )}

      {folha === 'ajustar' && turno && ajusteId && (
        <Sheet titulo="Corrigir apontamento" onClose={() => setFolha(null)}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!frenteId) return
              setEnviando(true)
              setErro(null)
              try {
                const apt = colab.apontamentos.find((x) => x.id === ajusteId)
                await ajustarApontamento(ajusteId, {
                  horaInicio: formatarHora(horaIni),
                  horaFim: apt?.horaFim ? formatarHora(horaFim) : undefined,
                  frenteId,
                })
                setFolha(null)
                await carregar()
              } catch (err) {
                setErro(mensagemErro(err, 'Não foi possível corrigir.'))
              } finally {
                setEnviando(false)
              }
            }}
          >
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-aco">Frente</p>
              <div className="space-y-1">
                {turno.frentes.filter((f) => !obraId || f.obraId === obraId).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrenteId(f.id)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left ${
                      frenteId === f.id ? 'border-grafite bg-concreto' : 'border-linha'
                    }`}
                  >
                    <span className="h-8 w-1 shrink-0 rounded" style={{ background: f.cor }} />
                    <span className="font-disp">{f.nome}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-aco">Início</p>
              <div className="flex items-center gap-3">
                <button type="button" className="h-12 w-12 rounded-xl border border-linha bg-white font-disp text-2xl" onClick={() => setHoraIni((h) => h - 5)}>
                  −
                </button>
                <div className="flex-1 text-center font-disp text-3xl">{formatarHora(horaIni)}</div>
                <button type="button" className="h-12 w-12 rounded-xl border border-linha bg-white font-disp text-2xl" onClick={() => setHoraIni((h) => h + 5)}>
                  +
                </button>
              </div>
            </div>
            {colab.apontamentos.find((x) => x.id === ajusteId)?.horaFim && (
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-aco">Término</p>
                <div className="flex items-center gap-3">
                  <button type="button" className="h-12 w-12 rounded-xl border border-linha bg-white font-disp text-2xl" onClick={() => setHoraFim((h) => h - 5)}>
                    −
                  </button>
                  <div className="flex-1 text-center font-disp text-3xl">{formatarHora(horaFim)}</div>
                  <button type="button" className="h-12 w-12 rounded-xl border border-linha bg-white font-disp text-2xl" onClick={() => setHoraFim((h) => h + 5)}>
                    +
                  </button>
                </div>
              </div>
            )}
            <button type="submit" disabled={enviando} className="btn-primary h-14">
              {enviando ? 'Salvando…' : 'SALVAR'}
            </button>
          </form>
        </Sheet>
      )}

      {folha === 'editar' && colab && (
        <Sheet titulo={`Nome e função — ${colab.nome}`} onClose={() => setFolha(null)}>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              setEnviando(true)
              setErro(null)
              try {
                const custoTxt = custoEd.trim().replace(/\s/g, '').replace(',', '.')
                const custoNum = custoTxt ? Number(custoTxt) : undefined
                await cadastroService.atualizarColaborador(colab.id, {
                  nome: nomeEd.trim(),
                  funcao: funcaoEd.trim() || '—',
                  custoHora: custoNum != null && Number.isFinite(custoNum) && custoNum > 0 ? custoNum : null,
                  codigoExterno: codigoEd.trim() || null,
                })
                setFolha(null)
                await carregar()
              } catch (err) {
                setErro(mensagemErro(err, 'Não foi possível alterar o funcionário.'))
              } finally {
                setEnviando(false)
              }
            }}
          >
            <label className="block">
              <span className="label">Nome</span>
              <input
                className="input"
                value={nomeEd}
                onChange={(e) => setNomeEd(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="label">Função</span>
              <input
                className="input"
                value={funcaoEd}
                onChange={(e) => setFuncaoEd(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">Código externo</span>
              <input
                className="input"
                value={codigoEd}
                onChange={(e) => setCodigoEd(e.target.value)}
                maxLength={40}
              />
            </label>
            <label className="block">
              <span className="label">Valor da hora (R$)</span>
              <input
                className="input"
                value={custoEd}
                onChange={(e) => setCustoEd(e.target.value)}
                inputMode="decimal"
                placeholder="Ex.: 32,40"
              />
            </label>
            <button
              type="submit"
              disabled={enviando}
              className="btn-primary"
            >
              {enviando ? 'Salvando…' : 'Salvar'}
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
