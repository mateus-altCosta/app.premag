import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { AlertMsg, PageHead } from '../../components/ui'
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
    <div>
      <PageHead
        kicker="Produção"
        titulo="Obras"
        sub={obras.length ? `${obras.length} obra${obras.length === 1 ? '' : 's'} na planta` : 'Obras e frentes de serviço'}
      />
      <div className="space-y-2">
      {erro && <AlertMsg>{erro}</AlertMsg>}
      {obras.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => navigate(`/obras/${o.id}`)}
          className="card w-full p-3.5 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-disp text-[16px] leading-tight tracking-wide">{o.nome}</span>
            <span className="font-disp text-xl tabular-nums">{Math.round(o.percentualAvanco)}%</span>
          </div>
          <p className="kicker mt-1">
            {o.cliente} · {o.quantidadeFrentes} frentes
          </p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-ambar" style={{ width: `${Math.min(100, o.percentualAvanco)}%` }} />
          </div>
        </button>
      ))}
      {diretoria && (
        <button type="button" onClick={() => setAbrir(true)} className="btn-dashed">
          + Cadastrar obra
        </button>
      )}
      </div>
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
            <button type="submit" disabled={enviando} className="btn-primary">
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
