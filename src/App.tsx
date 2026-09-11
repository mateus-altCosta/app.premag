import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import InicioRedirect from './pages/Inicio/InicioPage'
import LoginPage from './pages/Login/LoginPage'
import EquipesPage from './pages/Equipes/EquipesPage'
import EquipePage from './pages/Equipes/EquipePage'
import ColaboradorPage from './pages/Equipes/ColaboradorPage'
import ObrasPage from './pages/Obras/ObrasPage'
import ObraPage from './pages/Obras/ObraPage'
import PendenciasPage from './pages/Pendencias/PendenciasPage'
import DiarioPage from './pages/Diario/DiarioPage'
import AlertasPage from './pages/Alertas/AlertasPage'
import RelatoriosPage from './pages/Relatorios/RelatoriosPage'
import FechamentoPage from './pages/Fechamento/FechamentoPage'
import { isLoggedIn } from './app/services/premag/session'

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn() ? <Navigate to="/inicio" replace /> : <LoginPage />}
      />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/inicio" element={<InicioRedirect />} />
        <Route path="/equipes" element={<EquipesPage />} />
        <Route path="/equipes/:id" element={<EquipePage />} />
        <Route path="/equipes/:id/colaboradores/:colabId" element={<ColaboradorPage />} />
        <Route path="/obras" element={<ObrasPage />} />
        <Route path="/obras/:id" element={<ObraPage />} />
        <Route path="/pendencias" element={<PendenciasPage />} />
        <Route path="/diario" element={<DiarioPage />} />
        <Route path="/alertas" element={<AlertasPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/fechamento" element={<FechamentoPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isLoggedIn() ? '/inicio' : '/login'} replace />} />
    </Routes>
  )
}
