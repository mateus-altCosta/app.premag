import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../app/services/premag/authService.service'
import { api } from '../../app/services/premag/api.service'
import { appConfig, getHealthUrl } from '../../config/app.config'
import { ativarPush } from '../../app/services/premag/push'

export default function LoginPage() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('admin')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [apiOk, setApiOk] = useState<boolean | null>(null)

  useEffect(() => {
    api
      .get(getHealthUrl(appConfig.apiUrl), { baseURL: '' })
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false))
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await authService.login(usuario.trim(), senha)
      await ativarPush()
      navigate('/inicio', { replace: true })
    } catch {
      setErro('Usuário ou senha inválidos.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grafite px-6">
      <form onSubmit={onSubmit} className="w-full max-w-md">
        <h1 className="font-disp text-5xl tracking-wide text-ambar">PREMAG</h1>
        <p className="mb-8 mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-aco">
          Apropriação de mão de obra
        </p>

        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-aco">Usuário</label>
        <input
          className="mb-4 w-full rounded border border-[#2c3238] bg-[#1c2126] px-3 py-3 text-papel outline-none focus:border-ambar"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-aco">Senha</label>
        <input
          type="password"
          className="mb-4 w-full rounded border border-[#2c3238] bg-[#1c2126] px-3 py-3 text-papel outline-none focus:border-ambar"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          required
        />

        {erro && <p className="mb-3 text-sm text-red-400">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded bg-ambar py-3 font-disp text-lg text-grafite disabled:opacity-50"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="mt-6 font-mono text-xs text-aco">
          API:{' '}
          {apiOk === null ? 'verificando…' : apiOk ? 'online' : 'offline — a API não respondeu'}
        </p>
      </form>
    </div>
  )
}
