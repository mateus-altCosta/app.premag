import { Navigate } from 'react-router-dom'
import { loadSession } from '../../app/services/premag/session'
import { ehEncarregado } from '../../app/services/premag/perfil'

export default function InicioRedirect() {
  const session = loadSession()
  if (ehEncarregado(session?.perfil) && session?.equipeId) {
    return <Navigate to={`/equipes/${session.equipeId}`} replace />
  }
  return <Navigate to="/equipes" replace />
}
