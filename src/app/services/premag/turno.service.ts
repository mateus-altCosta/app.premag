import { isAxiosError } from 'axios'
import { api } from './api.service'
import { getDispositivoId } from './session'
import type { EncerrarResultadoDto, TurnoDto, ApontamentoDto, TurnoColaboradorDto } from '../../models/entity/Turno.dto'
import { kv } from './idb'
import { enfileirar } from './sync.service'
import { isFalhaDeRede, marcarAlcanceApi } from './rede'

export function mensagemErro(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { detail?: string; message?: string } | undefined
    if (data?.detail) return data.detail
    if (data?.message) return data.message
  }
  return fallback
}

export function codigoErro(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  return (err.response?.data as { codigo?: string } | undefined)?.codigo
}

function chaveTurno(equipeId: string) {
  return `turno:${equipeId}`
}

async function guardarTurno(equipeId: string, turno: TurnoDto): Promise<void> {
  await kv.set(chaveTurno(equipeId), turno)
}

async function turnoEmCache(equipeId: string): Promise<TurnoDto | undefined> {
  return kv.get<TurnoDto>(chaveTurno(equipeId))
}

async function atualizarTurno(equipeId: string, mutar: (t: TurnoDto) => void): Promise<TurnoDto | undefined> {
  const t = await turnoEmCache(equipeId)
  if (!t) return undefined
  mutar(t)
  await guardarTurno(equipeId, t)
  return t
}

function frenteDoTurno(turno: TurnoDto, frenteId: string) {
  return turno.frentes.find((f) => f.id === frenteId)
}

function aplicarIniciar(turno: TurnoDto, dados: {
  colaboradorId: string
  frenteId: string
  horaInicio: string
  clienteUuid: string
  observacao?: string
}): ApontamentoDto {
  const frente = frenteDoTurno(turno, dados.frenteId)
  const apt: ApontamentoDto = {
    id: dados.clienteUuid,
    clienteUuid: dados.clienteUuid,
    colaboradorId: dados.colaboradorId,
    frenteId: dados.frenteId,
    frenteNome: frente?.nome ?? 'Frente',
    frenteCor: frente?.cor ?? '#4A5560',
    unidade: frente?.unidade ?? 'un',
    obraId: frente?.obraId ?? '',
    obraNome: frente?.obraNome ?? '',
    frenteIndireta: frente?.etapaIndireta ?? false,
    data: turno.data,
    horaInicio: dados.horaInicio,
    horaFim: null,
    minutosEfetivos: null,
    observacao: dados.observacao,
    jornadaNaoVerificada: true,
    aberto: true,
    pendente: true,
  }
  const colab = turno.colaboradores.find((c) => c.id === dados.colaboradorId)
  if (colab) {
    if (colab.aberto) {
      colab.aberto.horaFim = dados.horaInicio
      colab.aberto.aberto = false
      colab.aberto.pendente = true
    }
    colab.aberto = apt
    colab.apontamentos = [...colab.apontamentos, apt]
  }
  return apt
}

function aplicarEncerrar(turno: TurnoDto, apontamentoId: string, horaFim: string): ApontamentoDto | undefined {
  const colab = turno.colaboradores.find((c) => c.aberto?.id === apontamentoId || c.aberto?.clienteUuid === apontamentoId)
  const aberto = colab?.aberto
  if (!colab || !aberto) return undefined
  aberto.horaFim = horaFim
  aberto.aberto = false
  aberto.pendente = true
  colab.aberto = null
  return aberto
}

export const turnoService = {
  obter: async (equipeId: string, data?: string) => {
    try {
      const t = (await api.get<TurnoDto>('/turno', { params: { equipeId, data } })).data
      marcarAlcanceApi(true)
      await guardarTurno(equipeId, t)
      return t
    } catch (err) {
      if (!isFalhaDeRede(err)) throw err
      marcarAlcanceApi(false)
      const cached = await turnoEmCache(equipeId)
      if (cached) return cached
      throw err
    }
  },

  iniciar: async (equipeId: string, dados: {
    colaboradorId: string
    frenteId: string
    horaInicio: string
    motivoParadaId?: string | null
    observacao?: string
    clienteUuid: string
  }) => {
    const corpo = { ...dados, dispositivoId: getDispositivoId() }
    try {
      const criado = (await api.post<ApontamentoDto>('/apontamentos/iniciar', corpo)).data
      marcarAlcanceApi(true)
      return criado
    } catch (err) {
      if (!isFalhaDeRede(err)) throw err
      marcarAlcanceApi(false)
      await enfileirar({
        tipo: 'iniciar',
        iniciar: corpo,
      })
      const turno = await turnoEmCache(equipeId)
      if (turno) {
        const local = aplicarIniciar(turno, dados)
        await guardarTurno(equipeId, turno)
        return local
      }
      return {
        id: dados.clienteUuid,
        clienteUuid: dados.clienteUuid,
        colaboradorId: dados.colaboradorId,
        frenteId: dados.frenteId,
        frenteNome: '',
        frenteCor: '#4A5560',
        unidade: 'un',
        obraId: '',
        obraNome: '',
        frenteIndireta: false,
        data: new Date().toISOString().slice(0, 10),
        horaInicio: dados.horaInicio,
        horaFim: null,
        aberto: true,
        pendente: true,
        jornadaNaoVerificada: true,
      } satisfies ApontamentoDto
    }
  },

  encerrar: async (
    equipeId: string,
    id: string,
    dados: {
      horaFim: string
      clienteUuid: string
      producao?: { clienteUuid: string; quantidade: number }
    },
    apontamentoClienteUuid?: string,
    pendente = false,
  ) => {
    const gravarNaFila = async () => {
      const turno = await turnoEmCache(equipeId)
      const aberto = turno?.colaboradores.find((c: TurnoColaboradorDto) => c.aberto?.id === id)?.aberto
      const local = pendente || aberto?.pendente === true
      await enfileirar({
        tipo: 'encerrar',
        apontamentoId: local ? undefined : id,
        apontamentoClienteUuid: apontamentoClienteUuid ?? aberto?.clienteUuid ?? id,
        encerrar: dados,
      })
      let fechado: ApontamentoDto | undefined
      await atualizarTurno(equipeId, (t) => {
        fechado = aplicarEncerrar(t, id, dados.horaFim)
      })
      const apontamento = fechado ?? {
        id,
        clienteUuid: apontamentoClienteUuid ?? id,
        colaboradorId: '',
        frenteId: '',
        frenteNome: '',
        frenteCor: '#4A5560',
        unidade: 'un',
        obraId: '',
        obraNome: '',
        frenteIndireta: false,
        data: new Date().toISOString().slice(0, 10),
        horaInicio: '07:00',
        horaFim: dados.horaFim,
        aberto: false,
        pendente: true,
        jornadaNaoVerificada: true,
      }
      return { apontamento, avisos: [] as string[] } satisfies EncerrarResultadoDto
    }

    if (pendente) return gravarNaFila()

    try {
      const res = (await api.post<EncerrarResultadoDto>(`/apontamentos/${id}/encerrar`, dados)).data
      marcarAlcanceApi(true)
      return res
    } catch (err) {
      if (!isFalhaDeRede(err)) throw err
      marcarAlcanceApi(false)
      return gravarNaFila()
    }
  },
}
