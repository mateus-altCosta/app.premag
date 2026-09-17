import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mensagemErro } from '../../app/services/premag/cadastro.service'
import { ativarPush, desligarPush } from '../../app/services/premag/push'
import { api } from '../../app/services/premag/api.service'

export default function ContaPage() {
  const navigate = useNavigate()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

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
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-3 font-mono text-[10px] uppercase tracking-wider text-aco"
      >
        ← Voltar
      </button>
      <p className="font-disp text-xl">Conta</p>
      <p className="mt-1 text-sm text-aco">Troca de senha e notificações neste aparelho.</p>

      <form onSubmit={senha} className="mt-4 rounded border border-[#CFCCC5] bg-papel p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-aco">Senha</p>
        <input
          type="password"
          className="mt-2 w-full rounded border border-[#CFCCC5] px-3 py-2 text-sm"
          placeholder="Senha atual"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          required
        />
        <input
          type="password"
          className="mt-2 w-full rounded border border-[#CFCCC5] px-3 py-2 text-sm"
          placeholder="Senha nova (mín. 8)"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          minLength={8}
          required
        />
        <input
          type="password"
          className="mt-2 w-full rounded border border-[#CFCCC5] px-3 py-2 text-sm"
          placeholder="Confirmar senha nova"
          value={confirma}
          onChange={(e) => setConfirma(e.target.value)}
          minLength={8}
          required
        />
        {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-2 text-sm text-green-800">{ok}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="mt-3 w-full rounded bg-ambar py-3 font-disp text-lg text-grafite disabled:opacity-50"
        >
          {enviando ? 'Salvando…' : 'Trocar senha'}
        </button>
      </form>

      <div className="mt-3 rounded border border-[#CFCCC5] bg-papel p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-aco">Notificações</p>
        <button
          type="button"
          className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[#B07500]"
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
