import { FormEvent, useRef, useState } from 'react'
import Sheet from './Sheet'
import type { FrenteDto } from '../app/models/entity/Cadastro.dto'
import type { TipoFoto } from '../app/models/entity/Operacao.dto'
import { comprimirJpeg } from '../app/services/premag/jpeg'
import { mensagemErro } from '../app/services/premag/cadastro.service'
import { operacaoService } from '../app/services/premag/operacao.service'
import { isFalhaDeRede } from '../app/services/premag/rede'
import { enfileirar } from '../app/services/premag/sync.service'
import { clienteUuid } from '../app/services/premag/jornada'

const TIPOS: { id: TipoFoto; label: string }[] = [
  { id: 'Avanco', label: 'Avanço' },
  { id: 'Ocorrencia', label: 'Ocorrência' },
  { id: 'RecebimentoMaterial', label: 'Recebimento de material' },
]

export default function FotoSheet({
  frentes,
  obraId,
  colaboradorId,
  apontamentoId,
  frenteIdInicial,
  onClose,
  onOk,
}: {
  frentes: FrenteDto[]
  obraId?: string
  colaboradorId?: string | null
  apontamentoId?: string | null
  frenteIdInicial?: string | null
  onClose: () => void
  onOk: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [tipo, setTipo] = useState<TipoFoto>('Avanco')
  const [frenteId, setFrenteId] = useState(frenteIdInicial ?? '')
  const [qtd, setQtd] = useState('')
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const visiveis = frentes.filter((f) => !f.etapaIndireta && (!obraId || f.obraId === obraId))
  const frente = visiveis.find((f) => f.id === frenteId)

  async function onArquivo(file: File | undefined) {
    if (!file) return
    setErro(null)
    try {
      const jpeg = await comprimirJpeg(file)
      setBlob(jpeg)
      setPreview(URL.createObjectURL(jpeg))
    } catch {
      setErro('Não foi possível ler a imagem. Use JPEG ou a câmera do celular.')
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!blob || !frenteId) return
    setEnviando(true)
    setErro(null)
    try {
      await operacaoService.enviarFoto({
        jpeg: blob,
        frenteId,
        tipo,
        colaboradorId,
        apontamentoId,
        quantidade: tipo === 'Avanco' ? qtd : undefined,
        observacao: obs,
      })
      onOk()
    } catch (err) {
      if (isFalhaDeRede(err)) {
        await enfileirar({
          tipo: 'foto',
          jpeg: blob,
          foto: {
            frenteId,
            tipo,
            colaboradorId,
            apontamentoId,
            quantidade: tipo === 'Avanco' ? qtd : undefined,
            observacao: obs,
            clienteUuid: clienteUuid(),
          },
        })
        onOk()
        return
      }
      setErro(mensagemErro(err, 'Não foi possível anexar a foto.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Sheet titulo="Registro fotográfico" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {erro && <p className="text-sm text-red-700">{erro}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onArquivo(e.target.files?.[0])}
        />
        {!preview ? (
          <>
            <p className="rounded border border-dashed border-[#CFCCC5] p-8 text-center text-sm text-aco">
              Nenhuma imagem capturada.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="h-14 w-full rounded bg-ambar font-disp text-lg text-grafite"
            >
              ABRIR CÂMERA
            </button>
            <p className="text-xs text-aco">
              No celular abre a câmera traseira. A imagem é reduzida e comprimida — original de 4 MB não entra na fila.
            </p>
          </>
        ) : (
          <>
            <img src={preview} alt="captura" className="w-full rounded border border-[#CFCCC5]" />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded border border-[#CFCCC5] py-2 font-mono text-[11px] uppercase"
            >
              Refazer foto
            </button>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-aco">Tipo de registro</p>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipo(t.id)}
                    className={`rounded border px-3 py-1.5 font-mono text-[11px] uppercase ${
                      tipo === t.id ? 'border-ambar bg-ambar text-grafite' : 'border-[#CFCCC5]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-aco">Frente</p>
              <div className="space-y-1">
                {visiveis.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrenteId(f.id)}
                    className={`flex w-full items-center gap-2 rounded border px-3 py-2 text-left ${
                      frenteId === f.id ? 'border-ambar' : 'border-[#CFCCC5]'
                    }`}
                  >
                    <span className="h-8 w-1 shrink-0 rounded" style={{ background: f.cor }} />
                    <span className="min-w-0">
                      <span className="block font-disp">{f.nome}</span>
                      <span className="font-mono text-[10px] uppercase text-aco">
                        {f.obraNome} · {f.quantidadeConcluida}/{f.quantidadePrevista} {f.unidade}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {tipo === 'Avanco' && (
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-aco">
                  Quantidade concluída{frente ? ` (${frente.unidade})` : ''}
                </span>
                <input
                  className="w-full rounded border border-[#CFCCC5] px-3 py-3"
                  inputMode="decimal"
                  value={qtd}
                  onChange={(e) => setQtd(e.target.value)}
                  placeholder="0"
                />
                <p className="mt-2 text-xs text-aco">
                  A foto é a evidência do avanço, não a medida dele. A quantidade continua sendo da <b>frente</b>.
                </p>
              </label>
            )}
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-aco">Observação</span>
              <input
                className="w-full rounded border border-[#CFCCC5] px-3 py-2"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Ex.: 6 vigas armadas na pista 02"
              />
            </label>
            <button
              type="submit"
              disabled={!blob || !frenteId || enviando}
              className="h-14 w-full rounded bg-ambar font-disp text-lg text-grafite disabled:opacity-40"
            >
              {enviando ? 'Enviando…' : 'ANEXAR AO DIÁRIO'}
            </button>
          </>
        )}
      </form>
    </Sheet>
  )
}
