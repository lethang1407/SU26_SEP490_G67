import { createRoot } from 'react-dom/client'
import App from './app/App'
import AuthProvider from './app/providers/AuthProvider'

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
