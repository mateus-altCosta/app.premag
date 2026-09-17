const DB_NOME = 'premag'
const DB_VERSAO = 2

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, DB_VERSAO)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      if (!db.objectStoreNames.contains('fila')) {
        db.createObjectStore('fila', { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(
  store: 'kv' | 'fila',
  mode: IDBTransactionMode,
  work: (s: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const s = t.objectStore(store)
        const req = work(s)
        t.oncomplete = () => resolve(req ? req.result : (undefined as T))
        t.onerror = () => reject(t.error)
        if (req) {
          req.onerror = () => reject(req.error)
        }
      }),
  )
}

export const kv = {
  async get<T>(chave: string): Promise<T | undefined> {
    const row = await tx<{ v: T; em: number } | undefined>('kv', 'readonly', (s) => s.get(chave))
    if (!row) return undefined
    const max = 72 * 60 * 60 * 1000 // RNF-03
    if (Date.now() - row.em > max) {
      await kv.del(chave)
      return undefined
    }
    return row.v
  },
  async set<T>(chave: string, valor: T): Promise<void> {
    await tx('kv', 'readwrite', (s) => s.put({ v: valor, em: Date.now() }, chave))
  },
  async del(chave: string): Promise<void> {
    await tx('kv', 'readwrite', (s) => s.delete(chave))
  },
  async keys(): Promise<string[]> {
    const db = await abrir()
    return new Promise((resolve, reject) => {
      const t = db.transaction('kv', 'readonly')
      const req = t.objectStore('kv').getAllKeys()
      req.onsuccess = () => resolve(req.result.map(String))
      req.onerror = () => reject(req.error)
    })
  },
}

export interface ItemFila {
  id?: number
  tipo: 'iniciar' | 'encerrar' | 'producao' | 'foto'
  criadoEm: string
  tentativas: number
  erro?: string | null
  apontamentoId?: string
  apontamentoClienteUuid?: string
  iniciar?: Record<string, unknown>
  encerrar?: Record<string, unknown>
  producao?: Record<string, unknown>
  jpeg?: Blob
  foto?: {
    frenteId: string
    tipo: string
    colaboradorId?: string | null
    apontamentoId?: string | null
    quantidade?: string
    observacao?: string
    clienteUuid: string
  }
}

export const filaStore = {
  async listar(): Promise<ItemFila[]> {
    const db = await abrir()
    return new Promise((resolve, reject) => {
      const t = db.transaction('fila', 'readonly')
      const req = t.objectStore('fila').getAll()
      req.onsuccess = () => resolve((req.result as ItemFila[]) ?? [])
      req.onerror = () => reject(req.error)
    })
  },
  async enfileirar(item: Omit<ItemFila, 'id' | 'criadoEm' | 'tentativas'> & Partial<Pick<ItemFila, 'tentativas'>>): Promise<number> {
    const row: ItemFila = {
      ...item,
      criadoEm: new Date().toISOString(),
      tentativas: item.tentativas ?? 0,
      erro: item.erro ?? null,
    }
    const db = await abrir()
    return new Promise((resolve, reject) => {
      const t = db.transaction('fila', 'readwrite')
      const req = t.objectStore('fila').add(row)
      req.onsuccess = () => resolve(Number(req.result))
      req.onerror = () => reject(req.error)
    })
  },
  async remover(id: number): Promise<void> {
    await tx('fila', 'readwrite', (s) => s.delete(id))
  },
  async marcarErro(id: number, erro: string): Promise<void> {
    const db = await abrir()
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('fila', 'readwrite')
      const store = t.objectStore('fila')
      const get = store.get(id)
      get.onsuccess = () => {
        const row = get.result as ItemFila | undefined
        if (!row) {
          resolve()
          return
        }
        row.erro = erro
        row.tentativas = (row.tentativas ?? 0) + 1
        store.put(row)
      }
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
    })
  },
}
