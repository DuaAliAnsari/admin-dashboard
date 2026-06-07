import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute() {
  const { session, isLoading, isAdmin } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/sign-in" replace />
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="font-display text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          This area is restricted to admin users only.
        </p>
        <button
          className="text-sm text-primary underline"
          onClick={() => (window.location.href = '/sign-in')}
        >
          Sign in with an admin account
        </button>
      </div>
    )
  }

  return <Outlet />
}
