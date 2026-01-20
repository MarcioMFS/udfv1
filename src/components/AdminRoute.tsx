import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading: authLoading } = useAuth()
  const { isAdmin, isLoading: adminLoading } = useIsAdmin()

  // Show loading while checking authentication and admin status
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Redirect to dashboard if not admin
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
