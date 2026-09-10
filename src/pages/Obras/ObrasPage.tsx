import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import type { ObraDto } from '../../app/models/entity/Cadastro.dto'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import { loadSession } from '../../app/services/premag/session'
import { ehDiretoria } from '../../app/services/premag/perfil'

export default function ObrasPage() {
  const navigate = useNavigate()
  const diretoria = ehDiretoria(loadSession()?.perfil)
  const [obras, setObras] = useState<ObraDto[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [abrir, setAbrir] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState({ nome: '', cliente: '', tipo: '', local: '', codigoSienge: '' })

  async function carregar() {
    setObras(await cadastroService.obras())
  }

  useEffect(() => {
    carregar().catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar as obras.')))
  }, [])

  async function onCriar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      const criada = await cadastroService.criarObra({
        nome: form.nome.trim(),
        cliente: form.cliente.trim(),
        tipo: form.tipo.trim(),
        local: form.local.trim(),
        codigoSienge: form.codigoSienge.trim() || undefined,
      })
      setAbrir(false)
      setForm({ nome: '', cliente: '', tipo: '', local: '', codigoSienge: '' })
      await carregar()
      navigate(`/obras/${criada.id}`)
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível cadastrar a obra.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-2">
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      {obras.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => navigate(`/obras/${o.id}`)}
          className="w-full rounded border border-[#CFCCC5] bg-papel p-3 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-disp text-[16px] leading-tight">{o.nome}</span>
            <span className="font-disp text-xl">{Math.round(o.percentualAvanco)}%</span>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-aco">
            {o.cliente} · {o.quantidadeFrentes} frentes
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded bg-[#E4E1DA]">
            <div className="h-full bg-ambar" style={{ width: `${Math.min(100, o.percentualAvanco)}%` }} />
          </div>
        </button>
      ))}
      {diretoria && (
        <button
          type="button"
          onClick={() => setAbrir(true)}
          className="w-full rounded border border-dashed border-[#B07500] py-3 font-mono text-[11px] uppercase tracking-wider text-[#B07500]"
        >
          + Cadastrar obra
        </button>
      )}
      {abrir && (
        <Sheet titulo="Cadastrar obra" onClose={() => setAbrir(false)}>
          <form onSubmit={onCriar} className="space-y-3">
            <Campo label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} required />
            <Campo label="Cliente" value={form.cliente} onChange={(v) => setForm({ ...form, cliente: v })} required />
            <Campo label="Tipo" value={form.tipo} onChange={(v) => setForm({ ...form, tipo: v })} />
            <Campo label="Local" value={form.local} onChange={(v) => setForm({ ...form, local: v })} />
            <Campo
              label="Código no Sienge"
              value={form.codigoSienge}
              onChange={(v) => setForm({ ...form, codigoSienge: v })}
            />
            <p className="text-xs text-aco">Depois de cadastrar a obra, as frentes são criadas pelo Gerente.</p>
            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded bg-ambar py-3 font-disp text-lg text-grafite disabled:opacity-50"
            >
              {enviando ? 'Salvando…' : 'Cadastrar obra'}
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
