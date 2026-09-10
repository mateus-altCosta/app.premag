export interface AuthTokenPairDto {
  accessToken: string
  refreshToken: string
  expiraEm: string
  perfil: string
  equipeId?: string | null
  nome: string
}
