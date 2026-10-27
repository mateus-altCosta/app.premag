import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cadastroService, mensagemErro } from '../../app/services/premag/cadastro.service'
import type { MotivoParadaDto, UsuarioListaDto } from '../../app/models/entity/Cadastro.dto'
import { ativarPush, desligarPush } from '../../app/services/premag/push'
import { api } from '../../app/services/premag/api.service'
import { loadSession } from '../../app/services/premag/session'
import { podeGerir } from '../../app/services/premag/perfil'

export default function ContaPage() {
  const navigate = useNavigate()
  const gerir = podeGerir(loadSession()?.perfil)
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [jornada, setJornada] = useState({
    jornadaInicio: '07:00',
    jornadaFim: '16:48',
    intervaloInicio: '12:00',
    intervaloFim: '13:00',
    jornadaPadraoMinutos: 528,
  })
  const [motivos, setMotivos] = useState<MotivoParadaDto[]>([])
  const [motivoNome, setMotivoNome] = useState('')
  const [motivoObs, setMotivoObs] = useState(false)
  const [motivoEditar, setMotivoEditar] = useState<string | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioListaDto[]>([])
  const [alvoSenha, setAlvoSenha] = useState('')
  const [senhaOutro, setSenhaOutro] = useState('')
  const [confirmaOutro, setConfirmaOutro] = useState('')

  useEffect(() => {
    if (!gerir) return
    cadastroService
      .catalogos()
      .then((c) => {
        setJornada(c.configuracao)
        setMotivos(c.motivosParada)
      })
      .catch(() => undefined)
    cadastroService.usuarios().then(setUsuarios).catch(() => undefined)
  }, [gerir])

  async function recarregarMotivos() {
    const c = await cadastroService.catalogos()
    setMotivos(c.motivosParada)
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

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)} className="link-back">
        ← Voltar
      </button>
      <p className="page-title">Conta</p>
      <p className="page-sub">
        Troca de senha{gerir ? ', jornada da planta e motivos de parada' : ''} e notificações neste aparelho.
      </p>

      {gerir && (
        <form
          className="mt-4 card-pad"
          onSubmit={async (e) => {
            e.preventDefault()
            setErro(null)
            setOk(null)
            setEnviando(true)
            try {
              const cat = await cadastroService.atualizarJornada(jornada)
              setJornada(cat.configuracao)
              setOk('Jornada e almoço atualizados. Vale no próximo carregamento do turno.')
            } catch (err) {
              setErro(mensagemErro(err, 'Não foi possível alterar a jornada.'))
            } finally {
              setEnviando(false)
            }
          }}
        >
          <p className="kicker">Jornada e almoço</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="label">Início</span>
              <input
                type="time"
                className="input"
                value={jornada.jornadaInicio}
                onChange={(e) => setJornada({ ...jornada, jornadaInicio: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="label">Fim</span>
              <input
                type="time"
                className="input"
                value={jornada.jornadaFim}
                onChange={(e) => setJornada({ ...jornada, jornadaFim: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="label">Almoço início</span>
              <input
                type="time"
                className="input"
                value={jornada.intervaloInicio}
                onChange={(e) => setJornada({ ...jornada, intervaloInicio: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="label">Almoço fim</span>
              <input
                type="time"
                className="input"
                value={jornada.intervaloFim}
                onChange={(e) => setJornada({ ...jornada, intervaloFim: e.target.value })}
                required
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-aco">
            {jornada.jornadaPadraoMinutos} min efetivos (jornada menos o almoço). Vale para a régua e o teto do dia.
          </p>
          <button
            type="submit"
            disabled={enviando}
            className="btn-primary mt-3"
          >
            {enviando ? 'Salvando…' : 'Salvar jornada'}
          </button>
        </form>
      )}

      {gerir && (
        <div className="mt-4 card-pad">
          <p className="kicker">Motivos de parada</p>
          <p className="mt-1 text-xs text-aco">
            Usados no intervalo entre serviços e nos alertas. Motivo desativado some da escolha; o histórico permanece.
          </p>
          <div className="mt-3 space-y-2">
            {motivos.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border border-linha px-3 py-2 ${m.ativo === false ? 'opacity-50' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-disp text-[15px]">{m.nome}</span>
                  <span className="font-mono text-[10px] uppercase text-aco">
                    {m.exigeObservacao ? 'exige obs.' : m.ativo === false ? 'inativo' : 'ativo'}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setMotivoEditar(m.id)
                      setMotivoNome(m.nome)
                      setMotivoObs(m.exigeObservacao)
                    }}
                  >
                    Alterar
                  </button>
                  {m.ativo === false ? (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={async () => {
                        setErro(null)
                        try {
                          await cadastroService.atualizarMotivo(m.id, {
                            nome: m.nome,
                            exigeObservacao: m.exigeObservacao,
                            ativo: true,
                          })
                          await recarregarMotivos()
                          setOk('Motivo reativado.')
                        } catch (err) {
                          setErro(mensagemErro(err, 'Não foi possível reativar o motivo.'))
                        }
                      }}
                    >
                      Reativar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="font-mono text-[10px] uppercase tracking-wider text-alerta"
                      onClick={async () => {
                        if (!confirm(`Desativar “${m.nome}”? Ele some da lista de escolha.`)) return
                        setErro(null)
                        try {
                          await cadastroService.inativarMotivo(m.id)
                          await recarregarMotivos()
                          setOk('Motivo desativado.')
                        } catch (err) {
                          setErro(mensagemErro(err, 'Não foi possível desativar o motivo.'))
                        }
                      }}
                    >
                      Desativar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <form
            className="mt-3 space-y-2"
            onSubmit={async (e) => {
              e.preventDefault()
              setErro(null)
              setOk(null)
              setEnviando(true)
              try {
                if (motivoEditar) {
                  const atual = motivos.find((m) => m.id === motivoEditar)
                  await cadastroService.atualizarMotivo(motivoEditar, {
                    nome: motivoNome.trim(),
                    exigeObservacao: motivoObs,
                    ativo: atual?.ativo !== false,
                  })
                  setOk('Motivo alterado.')
                } else {
                  await cadastroService.criarMotivo({
                    nome: motivoNome.trim(),
                    exigeObservacao: motivoObs,
                  })
                  setOk('Motivo cadastrado.')
                }
                setMotivoEditar(null)
                setMotivoNome('')
                setMotivoObs(false)
                await recarregarMotivos()
              } catch (err) {
                setErro(mensagemErro(err, 'Não foi possível gravar o motivo.'))
              } finally {
                setEnviando(false)
              }
            }}
          >
            <p className="kicker">
              {motivoEditar ? 'Alterar motivo' : 'Novo motivo'}
            </p>
            <input
              className="input"
              value={motivoNome}
              onChange={(e) => setMotivoNome(e.target.value)}
              placeholder="Nome"
              required
              maxLength={80}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={motivoObs} onChange={(e) => setMotivoObs(e.target.checked)} />
              Exige observação
            </label>
            <button
              type="submit"
              disabled={enviando}
              className="btn-primary"
            >
              {enviando ? 'Salvando…' : motivoEditar ? 'Salvar motivo' : 'Cadastrar motivo'}
            </button>
            {motivoEditar && (
              <button
                type="button"
                className="w-full font-mono text-[10px] uppercase tracking-wider text-aco"
                onClick={() => {
                  setMotivoEditar(null)
                  setMotivoNome('')
                  setMotivoObs(false)
                }}
              >
                Cancelar alteração
              </button>
            )}
          </form>
        </div>
      )}

      <form onSubmit={senha} className="mt-4 card-pad">
        <p className="kicker">Senha</p>
        <input
          type="password"
          className="input mt-2"
          placeholder="Senha atual"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          required
        />
        <input
          type="password"
          className="input mt-2"
          placeholder="Senha nova (mín. 8)"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          minLength={8}
          required
        />
        <input
          type="password"
          className="input mt-2"
          placeholder="Confirmar senha nova"
          value={confirma}
          onChange={(e) => setConfirma(e.target.value)}
          minLength={8}
          required
        />
        {erro && <p className="alert alert-erro mt-2">{erro}</p>}
        {ok && <p className="alert alert-ok mt-2">{ok}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="btn-primary mt-3"
        >
          {enviando ? 'Salvando…' : 'Trocar senha'}
        </button>
      </form>

      {gerir && (
        <form
          className="mt-4 card-pad"
          onSubmit={async (e) => {
            e.preventDefault()
            setErro(null)
            setOk(null)
            if (!alvoSenha) {
              setErro('Escolha o usuário.')
              return
            }
            if (senhaOutro !== confirmaOutro) {
              setErro('A confirmação não bate com a senha nova.')
              return
            }
            setEnviando(true)
            try {
              await cadastroService.redefinirSenha(alvoSenha, senhaOutro)
              setSenhaOutro('')
              setConfirmaOutro('')
              setOk('Senha redefinida. O usuário entra de novo com a senha nova.')
            } catch (err) {
              setErro(mensagemErro(err, 'Não foi possível redefinir a senha.'))
            } finally {
              setEnviando(false)
            }
          }}
        >
          <p className="kicker">Redefinir senha</p>
          <p className="mt-1 text-xs text-aco">Gerente grava uma senha nova para o login. Não usa e-mail.</p>
          <select
            className="input mt-2"
            value={alvoSenha}
            onChange={(e) => setAlvoSenha(e.target.value)}
            required
          >
            <option value="">Escolha o usuário</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome} · {u.userName} · {u.perfil}
                {u.equipeNome ? ` · ${u.equipeNome}` : ''}
              </option>
            ))}
          </select>
          <input
            type="password"
            className="input mt-2"
            placeholder="Senha nova (mín. 8)"
            value={senhaOutro}
            onChange={(e) => setSenhaOutro(e.target.value)}
            minLength={8}
            required
          />
          <input
            type="password"
            className="input mt-2"
            placeholder="Confirmar senha nova"
            value={confirmaOutro}
            onChange={(e) => setConfirmaOutro(e.target.value)}
            minLength={8}
            required
          />
          <button
            type="submit"
            disabled={enviando}
            className="btn-dark mt-3 font-mono text-[11px] uppercase tracking-wider"
          >
            {enviando ? 'Salvando…' : 'Gravar senha nova'}
          </button>
        </form>
      )}

      <div className="mt-3 card-pad">
        <p className="kicker">Notificações</p>
        <button
          type="button"
          className="btn-link mt-2"
          onClick={async () => {
            const r = await ativarPush()
            setOk(r === 'ok' ? 'Notificações ativas neste aparelho.' : null)
            setErro(r === 'ok' ? null : 'Não foi possível ativar. Use HTTPS e aceite o pedido do navegador.')
          }}
        >
          Ativar neste aparelho
        </button>
        <button
          type="button"
          className="mt-2 block font-mono text-[10px] uppercase tracking-wider text-aco"
          onClick={async () => {
            await desligarPush()
            setOk('Notificações desligadas neste aparelho.')
            setErro(null)
          }}
        >
          Desligar neste aparelho
        </button>
      </div>
    </div>
  )
}
