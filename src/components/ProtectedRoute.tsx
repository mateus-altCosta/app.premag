import { Navigate } from 'react-router-dom'
import { isLoggedIn } from '../app/services/premag/session'
import type { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return children
}
