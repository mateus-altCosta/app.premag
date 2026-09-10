export function podeGerir(perfil?: string | null): boolean {
  return perfil === 'Gerente' || perfil === 'Diretoria' || perfil === 'Admin'
}

export function ehDiretoria(perfil?: string | null): boolean {
  return perfil === 'Diretoria' || perfil === 'Admin'
}

export function ehEncarregado(perfil?: string | null): boolean {
  return perfil === 'Encarregado'
}
