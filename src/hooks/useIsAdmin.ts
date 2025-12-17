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
        return
      }

      const adminStatus = data?.is_admin || false
      console.log('✅ [useIsAdmin] Status final:', adminStatus)
      setIsAdmin(adminStatus)
    }

    checkAdmin()
  }, [user?.id])

  return isAdmin
}
