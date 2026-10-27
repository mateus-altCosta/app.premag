import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../app/services/premag/authService.service'
import { api } from '../../app/services/premag/api.service'
import { appConfig, getHealthUrl } from '../../config/app.config'
import { ativarPush } from '../../app/services/premag/push'
import { Marca } from '../../components/ui'

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
    } catch {
      setErro('Usuário ou senha inválidos.')
      setEnviando(false)
      return
    }
    try {
      await ativarPush()
    } catch {
      /* Push é opcional: falha aqui não é senha errada. */
    }
    navigate('/inicio', { replace: true })
  }

  return (
    <div className="app-frame flex min-h-dvh items-center justify-center px-5 py-10">
      <form
        onSubmit={onSubmit}
        className="rise-in w-full max-w-[400px] rounded-2xl border border-white/10 bg-[#171b21]/90 p-6 shadow-2xl backdrop-blur-md sm:p-8"
      >
        <div className="flex items-center gap-3">
          <Marca className="h-11 w-11 text-xl" />
          <div>
            <h1 className="font-disp text-4xl tracking-wide text-papel">PREMAG</h1>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ambar">
              Apropriação de mão de obra
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-[#9aa2a9]">
          Entre com o usuário da planta. O apontamento do dia continua no aparelho se a rede cair.
        </p>

        <label className="label mt-7 text-[#8b939a]">Usuário</label>
        <input
          className="input border-[#2c3238] bg-[#1c2126] text-papel focus:border-ambar"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="label mt-4 text-[#8b939a]">Senha</label>
        <input
          type="password"
          className="input border-[#2c3238] bg-[#1c2126] text-papel focus:border-ambar"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          required
        />

        {erro && <p className="alert alert-erro mt-4">{erro}</p>}

        <button type="submit" disabled={enviando} className="btn-primary mt-6 h-14">
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="mt-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#8b939a]">
          <i
            className={`h-1.5 w-1.5 rounded-full ${
              apiOk === null ? 'bg-[#8b939a]' : apiOk ? 'bg-emerald-400' : 'bg-alerta'
            }`}
          />
          API {apiOk === null ? 'verificando' : apiOk ? 'online' : 'offline — não respondeu'}
        </p>
      </form>
    </div>
  )
}
