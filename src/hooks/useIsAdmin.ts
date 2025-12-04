import { useAuth } from '../contexts/AuthContext'

/**
 * Hook para verificar se o usuário atual é admin
 * @returns boolean - true se for admin, false caso contrário
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth()
  return user?.isAdmin || false
}
