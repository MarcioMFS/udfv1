import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * Hook para verificar se o usuário atual é admin
 * @returns boolean - true se for admin, false caso contrário
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false)
      return
    }

    const checkAdmin = async () => {
      const { data } = await supabase
        .from('instructors')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      setIsAdmin(data?.is_admin || false)
    }

    checkAdmin()
  }, [user?.id])

  return isAdmin
}
