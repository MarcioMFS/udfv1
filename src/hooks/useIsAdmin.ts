import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * Hook para verificar se o usuário atual é admin
 * @returns objeto com isAdmin (boolean) e isLoading (boolean)
 */
export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false)
      setIsLoading(false)
      return
    }

    const checkAdmin = async () => {
      setIsLoading(true)
      console.log('🔍 [useIsAdmin] Verificando admin para user:', user.id)

      const { data, error } = await supabase
        .from('instructors')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      console.log('🔍 [useIsAdmin] Resultado:', { data, error })

      if (error) {
        console.error('❌ [useIsAdmin] Erro ao verificar admin:', error)
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      const adminStatus = data?.is_admin || false
      console.log('✅ [useIsAdmin] Status final:', adminStatus)
      setIsAdmin(adminStatus)
      setIsLoading(false)
    }

    checkAdmin()
  }, [user?.id])

  return { isAdmin, isLoading }
}
