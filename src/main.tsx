import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { aplicarTema, loadTemaPref } from './app/services/premag/tema'
import './styles/index.css'

aplicarTema()
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (loadTemaPref() === 'sistema') aplicarTema()
})

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
