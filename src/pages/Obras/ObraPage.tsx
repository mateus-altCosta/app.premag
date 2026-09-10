import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import type { CatalogoDto, EquipeDto, FrenteDto, ObraDto } from '../../app/models/entity/Cadastro.dto'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import { loadSession } from '../../app/services/premag/session'
import { podeGerir } from '../../app/services/premag/perfil'
import FotoSheet from '../../components/FotoSheet'
import GradeFotos from '../../components/GradeFotos'
import { operacaoService } from '../../app/services/premag/operacao.service'
import type { FotoDto } from '../../app/models/entity/Operacao.dto'

const UNIDADES = ['pç', 'm³', 'm', 'kg', 'h', 'un']

export default function ObraPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const gerir = podeGerir(loadSession()?.perfil)
  const [obra, setObra] = useState<ObraDto | null>(null)
  const [frentes, setFrentes] = useState<FrenteDto[]>([])
  const [equipes, setEquipes] = useState<EquipeDto[]>([])
  const [catalogo, setCatalogo] = useState<CatalogoDto | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [abrir, setAbrir] = useState(false)
  const [foto, setFoto] = useState(false)
  const [fotos, setFotos] = useState<FotoDto[]>([])
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    etapaId: '',
    equipeId: '' as string | '',
    unidade: 'pç',
    prevista: '',
    aco: '',
    hhOrc: '',
  })

  async function carregar() {
    if (!id) return
    const [o, fs, eqs, cat] = await Promise.all([
      cadastroService.obra(id),
      cadastroService.frentesDaObra(id),
      cadastroService.equipes(),
      cadastroService.catalogos(),
    ])
    setObra(o)
    setFrentes(fs)
    setEquipes(eqs)
    setCatalogo(cat)
    operacaoService.fotos().then(setFotos).catch(() => undefined)
    setForm((f) => ({ ...f, etapaId: f.etapaId || cat.etapas.find((e) => !e.indireta)?.id || '' }))
  }

  useEffect(() => {
    carregar().catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar a obra.')))
  }, [id])

  async function onCriar(e: FormEvent) {
    e.preventDefault()
    if (!id || !form.etapaId) return
    setEnviando(true)
    setErro(null)
    try {
      await cadastroService.criarFrente({
        obraId: id,
        nome: form.nome.trim(),
        etapaId: form.etapaId,
        equipeId: form.equipeId || null,
        unidade: form.unidade,
        quantidadePrevista: Number(form.prevista.replace(',', '.')) || 0,
        taxaAcoKgPorUnidade: form.aco ? Number(form.aco.replace(',', '.')) : null,
        hhOrcadoPorUnidade: form.hhOrc ? Number(form.hhOrc.replace(',', '.')) : null,
      })
      setAbrir(false)
      setForm((f) => ({ ...f, nome: '', prevista: '', aco: '', hhOrc: '', equipeId: '' }))
      await carregar()
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível cadastrar a frente.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={gerir ? 'pb-16' : undefined}>
      <button
        type="button"
        onClick={() => navigate('/obras')}
        className="mb-3 font-mono text-[10px] uppercase tracking-wider text-aco"
      >
        ← Voltar para obras
      </button>
      <p className="mb-3 font-disp text-xl leading-tight">{obra?.nome ?? 'Obra'}</p>
      {erro && <p className="mb-3 text-sm text-red-700">{erro}</p>}
      <div className="space-y-2">
        {frentes.map((f) => (
          <div key={f.id} className="flex overflow-hidden rounded border border-[#CFCCC5] bg-papel">
            <span className="w-1.5 shrink-0" style={{ background: f.cor }} />
            <div className="flex-1 p-3">
              <div className="flex items-start justify-between gap-3">
                <span className="font-disp text-[15px] leading-tight">{f.nome}</span>
                <span className="font-disp text-lg">{Math.round(f.percentualAvanco)}%</span>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-aco">
                {fmt(f.quantidadeConcluida)} de {fmt(f.quantidadePrevista)} {f.unidade} · equipe {f.equipeNome ?? '—'}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-[#E4E1DA]">
                <div className="h-full bg-ambar" style={{ width: `${Math.min(100, f.percentualAvanco)}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.hhPorUnidade != null ? (
                  <span className="rounded border border-[#CFCCC5] px-2 py-0.5 font-mono text-[10px] uppercase text-aco">
                    {fmt2(f.hhPorUnidade)} HH/{f.unidade} real
                  </span>
                ) : f.hhTotal ? (
                  <span className="rounded border border-[#CFCCC5] px-2 py-0.5 font-mono text-[10px] uppercase text-aco">
                    {fmt2(f.hhTotal)} HH
                  </span>
                ) : null}
                {f.hhOrcadoPorUnidade != null && (
                  <span className="rounded border border-[#CFCCC5] px-2 py-0.5 font-mono text-[10px] uppercase text-aco">
                    cotado {fmt2(f.hhOrcadoPorUnidade)} HH/{f.unidade}
                  </span>
                )}
                {f.acoEstimadoKg ? (
                  <span className="rounded border border-[#CFCCC5] px-2 py-0.5 font-mono text-[10px] uppercase text-aco">
                    aço est. {fmt(f.acoEstimadoKg)} kg
                  </span>
                ) : f.taxaAcoKgPorUnidade ? (
                  <span className="rounded border border-[#CFCCC5] px-2 py-0.5 font-mono text-[10px] uppercase text-aco">
                    {fmt(f.taxaAcoKgPorUnidade)} kg aço/{f.unidade}
                  </span>
                ) : null}
                {f.custoPorUnidade != null && (
                  <span className="rounded border border-[#CFCCC5] px-2 py-0.5 font-mono text-[10px] uppercase text-aco">
                    {fmtMoeda(f.custoPorUnidade)}/{f.unidade}
                  </span>
                )}
                {f.diasParaConcluir != null && (
                  <span
                    className="rounded border px-2 py-0.5 font-mono text-[10px] uppercase"
                    style={{ color: '#2D6A9F', borderColor: 'rgba(45,106,159,.3)' }}
                  >
                    ≈ {f.diasParaConcluir} dias p/ concluir
                  </span>
                )}
                {f.amostraInsuficiente && (
                  <span className="rounded border border-[#CFCCC5] px-2 py-0.5 font-mono text-[10px] uppercase text-aco">
                    amostra insuficiente
                  </span>
                )}
                <span className="rounded border border-[#CFCCC5] px-2 py-0.5 font-mono text-[10px] uppercase text-aco">
                  {f.etapaNome}
                </span>
              </div>
              <div className="mt-2">
                <GradeFotos fotos={fotos.filter((x) => x.frenteId === f.id).slice(0, 4)} colunas={4} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {gerir && (
        <button
          type="button"
          onClick={() => setAbrir(true)}
          className="mt-3 w-full rounded border border-dashed border-[#B07500] py-3 font-mono text-[11px] uppercase tracking-wider text-[#B07500]"
        >
          + Cadastrar frente
        </button>
      )}
      <p className="mt-3 text-xs text-aco">
        A previsão de prazo usa o ritmo real dos últimos 22 dias. Enquanto não houver amostra suficiente (5 lançamentos),
        o índice cotado é só referência — o aço na tela é estimado pela taxa de projeto × quantidade concluída.
      </p>

      {gerir && (
        <button
          type="button"
          onClick={() => setFoto(true)}
          className="fixed bottom-20 left-1/2 z-30 w-[calc(100%-2rem)] max-w-[448px] -translate-x-1/2 rounded bg-grafite py-3 font-disp text-lg text-papel"
        >
          REGISTRAR FOTO
        </button>
      )}

      {abrir && catalogo && (
        <Sheet titulo="Cadastrar frente" onClose={() => setAbrir(false)}>
          <form onSubmit={onCriar} className="space-y-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-aco">Nome</span>
              <input
                className="w-full rounded border border-[#CFCCC5] bg-white px-3 py-2 outline-none focus:border-ambar"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-aco">Etapa</span>
              <select
                className="w-full rounded border border-[#CFCCC5] bg-white px-3 py-2"
                value={form.etapaId}
                onChange={(e) => setForm({ ...form, etapaId: e.target.value })}
                required
              >
                {catalogo.etapas.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.nome}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-aco">Unidade</p>
              <div className="flex flex-wrap gap-2">
                {UNIDADES.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setForm({ ...form, unidade: u })}
                    className={`rounded border px-3 py-1.5 font-mono text-[11px] ${
                      form.unidade === u ? 'border-ambar bg-ambar text-grafite' : 'border-[#CFCCC5]'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-aco">Quantidade prevista</span>
              <input
                className="w-full rounded border border-[#CFCCC5] bg-white px-3 py-2"
                value={form.prevista}
                onChange={(e) => setForm({ ...form, prevista: e.target.value })}
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-aco">
                HH cotado por unidade
              </span>
              <input
                className="w-full rounded border border-[#CFCCC5] bg-white px-3 py-2"
                value={form.hhOrc}
                onChange={(e) => setForm({ ...form, hhOrc: e.target.value })}
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-aco">
                kg de aço por unidade
              </span>
              <input
                className="w-full rounded border border-[#CFCCC5] bg-white px-3 py-2"
                value={form.aco}
                onChange={(e) => setForm({ ...form, aco: e.target.value })}
                inputMode="decimal"
              />
            </label>
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-aco">Equipe</p>
              <div className="flex flex-wrap gap-2">
                {equipes.map((eq) => (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => setForm({ ...form, equipeId: form.equipeId === eq.id ? '' : eq.id })}
                    className={`rounded border px-3 py-1.5 font-mono text-[11px] uppercase ${
                      form.equipeId === eq.id ? 'border-ambar bg-ambar text-grafite' : 'border-[#CFCCC5]'
                    }`}
                  >
                    {eq.nome}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded bg-ambar py-3 font-disp text-lg text-grafite disabled:opacity-50"
            >
              {enviando ? 'Salvando…' : 'Cadastrar frente'}
            </button>
          </form>
        </Sheet>
      )}

      {foto && (
        <FotoSheet
          frentes={frentes}
          obraId={id}
          onClose={() => setFoto(false)}
          onOk={() => {
            setFoto(false)
            carregar().catch(() => undefined)
          }}
        />
      )}
    </div>
  )
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR')
}

function fmt2(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function fmtMoeda(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
