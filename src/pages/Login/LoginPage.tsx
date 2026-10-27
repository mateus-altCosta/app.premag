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
        className="rise-in w-full max-w-[400px] rounded-2xl border border-linha bg-papel p-6 shadow-sm sm:p-8"
      >
        <div className="flex items-center gap-3">
          <Marca className="h-10 w-10 text-base" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-grafite">PREMAG</h1>
            <p className="mt-0.5 text-[13px] font-medium text-aco">Apropriação de mão de obra</p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-aco">
          Entre com o usuário da planta. O apontamento do dia continua no aparelho se a rede cair.
        </p>

        <label className="label mt-7">Usuário</label>
        <input
          className="input"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="label mt-4">Senha</label>
        <input
          type="password"
          className="input"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          required
        />

        {erro && <p className="alert alert-erro mt-4">{erro}</p>}

        <button type="submit" disabled={enviando} className="btn-primary mt-6 h-12">
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="mt-6 flex items-center gap-2 text-[12px] font-medium text-aco">
          <i
            className={`h-1.5 w-1.5 rounded-full ${
              apiOk === null ? 'bg-aco' : apiOk ? 'bg-emerald-500' : 'bg-alerta'
            }`}
          />
          API {apiOk === null ? 'verificando' : apiOk ? 'online' : 'offline — não respondeu'}
        </p>
      </form>
    </div>
  )
}
