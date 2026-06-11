import { createRoot } from 'react-dom/client'
import App from './app/App'
import AuthProvider from './app/providers/AuthProvider'
import './index.css'

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
