import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, type UsuarioAtual } from '../../app/services/premag/authService.service'
import { api } from '../../app/services/premag/api.service'
import { loadSession } from '../../app/services/premag/session'
import { mensagemErro } from '../../app/services/premag/cadastro.service'
import { ativarPush, desligarPush, pushOptOut } from '../../app/services/premag/push'
import { loadTemaPref, salvarTema, type TemaPref } from '../../app/services/premag/tema'
import { podeGerir } from '../../app/services/premag/perfil'

const TEMAS: { id: TemaPref; label: string }[] = [
  { id: 'claro', label: 'Claro' },
  { id: 'escuro', label: 'Escuro' },
  { id: 'sistema', label: 'Sistema' },
]

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return 'P'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export default function ConfiguracoesPage() {
  const navigate = useNavigate()
  const session = loadSession()
  const gerir = podeGerir(session?.perfil)
  const [me, setMe] = useState<UsuarioAtual | null>(null)
  const [tema, setTema] = useState<TemaPref>(loadTemaPref)
  const [pushOn, setPushOn] = useState(!pushOptOut())
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    authService.me().then(setMe).catch(() => undefined)
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready
        .then((r) => r.pushManager.getSubscription())
        .then((s) => setPushOn(!!s && !pushOptOut()))
        .catch(() => undefined)
    }
  }, [])

  function escolherTema(pref: TemaPref) {
    setTema(pref)
    salvarTema(pref)
  }

  async function senha(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setOk(null)
    if (nova !== confirma) {
      setErro('A confirmação não bate com a senha nova.')
      return
    }
    setEnviando(true)
    try {
      await api.post('/auth/senha', { senhaAtual: atual, senhaNova: nova })
      setAtual('')
      setNova('')
      setConfirma('')
      setOk('Senha alterada.')
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível alterar a senha.'))
    } finally {
      setEnviando(false)
    }
  }

  const nome = me?.nome ?? session?.nome ?? '…'
  const perfil = me?.perfil ?? session?.perfil ?? '…'

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)} className="link-back">
        ← Voltar
      </button>
      <p className="page-title">Configurações</p>
      <p className="page-sub">Aparência, notificações e dados desta conta neste aparelho.</p>

      {erro && <p className="alert alert-erro mt-3">{erro}</p>}
      {ok && <p className="alert alert-ok mt-3">{ok}</p>}
      {pushMsg && <p className="alert alert-ok mt-3">{pushMsg}</p>}

      <section className="mt-4 card-pad">
        <p className="kicker">Aparência</p>
        <p className="mt-1 text-sm text-aco">
          O modo escuro vale neste aparelho, inclusive na tela de login.
        </p>
        <div className="seg mt-3">
          {TEMAS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`seg-item ${tema === t.id ? 'seg-item-on' : ''}`}
              onClick={() => escolherTema(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-3 card-pad">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="kicker">Notificações</p>
            <p className="mt-1 text-sm text-aco">
              {pushOn
                ? 'Alertas chegam neste aparelho quando o PREMAG está instalado em HTTPS.'
                : 'Ative para receber alerta de colaborador parado além do tempo da regra.'}
            </p>
          </div>
          <span className="badge shrink-0">{pushOn ? 'Ativas' : 'Desligadas'}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={async () => {
              const r = await ativarPush('manual')
              if (r === 'ok') {
                setPushOn(true)
                setPushMsg('Notificações ativas neste aparelho.')
                setErro(null)
              } else {
                setPushOn(false)
                setPushMsg(null)
                setErro(
                  r === 'negado'
                    ? 'O navegador bloqueou as notificações.'
                    : r === 'desligado'
                      ? 'Push ainda não está ligado neste ambiente.'
                      : 'Este aparelho não recebe push. Use o app instalado em HTTPS.',
                )
              }
            }}
          >
            {pushOn ? 'Reativar' : 'Ativar'}
          </button>
          <button
            type="button"
            className="btn-dark flex-1"
            onClick={async () => {
              await desligarPush()
              setPushOn(false)
              setPushMsg('Notificações desligadas neste aparelho.')
              setErro(null)
            }}
          >
            Desligar
          </button>
        </div>
      </section>

      <section className="mt-3 card-pad">
        <p className="kicker">Usuário</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grafite text-sm font-semibold text-papel">
            {iniciais(nome === '…' ? 'P' : nome)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight">{nome}</p>
            <p className="mt-0.5 truncate text-sm text-aco">{perfil}</p>
          </div>
        </div>
        <dl className="mt-3 space-y-2 text-sm">
          {me?.userName && (
            <div className="flex justify-between gap-3">
              <dt className="text-aco">Usuário</dt>
              <dd className="font-medium">{me.userName}</dd>
            </div>
          )}
          {me?.email && (
            <div className="flex justify-between gap-3">
              <dt className="text-aco">E-mail</dt>
              <dd className="truncate font-medium">{me.email}</dd>
            </div>
          )}
        </dl>
        <form onSubmit={senha} className="mt-4 space-y-2">
          <p className="label mb-0">Trocar senha</p>
          <input
            type="password"
            className="input"
            placeholder="Senha atual"
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
            required
          />
          <input
            type="password"
            className="input"
            placeholder="Senha nova (mín. 8)"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            minLength={8}
            required
          />
          <input
            type="password"
            className="input"
            placeholder="Confirmar senha nova"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            minLength={8}
            required
          />
          <button type="submit" disabled={enviando} className="btn-primary">
            {enviando ? 'Salvando…' : 'Salvar senha'}
          </button>
        </form>
      </section>

      {gerir && (
        <section className="mt-3 card-pad">
          <p className="kicker">Planta</p>
          <p className="mt-1 text-sm text-aco">
            Jornada, almoço, motivos de parada e redefinição de senha de outros usuários ficam em Conta.
          </p>
          <button type="button" className="btn-dark mt-3" onClick={() => navigate('/conta')}>
            Abrir conta
          </button>
        </section>
      )}

      <section className="mt-3 card-pad">
        <p className="kicker">Aplicativo</p>
        <p className="mt-2 text-sm text-aco">PREMAG Apropriação · versão 0.1.0</p>
        <p className="mt-1 text-sm text-aco">
          No celular, use o menu do navegador para adicionar à tela inicial e trabalhar offline.
        </p>
      </section>
    </div>
  )
}
