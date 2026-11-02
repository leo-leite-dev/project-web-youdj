import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthProvider'
import { OAuthReturnHandler } from '../features/auth/components/OAuthReturnHandler'
import { AppRoutes } from '../routes/AppRoutes'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OAuthReturnHandler />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
