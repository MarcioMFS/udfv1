import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface UpdateUserParams {
  user_id: string
  user_type: 'player' | 'instructor'
  data: {
    name?: string
    email?: string
  }
}

interface DeleteUserParams {
  user_id: string
  user_type: 'player' | 'instructor'
}

interface PromoteToInstructorParams {
  user_id: string
}

interface DemoteToPlayerParams {
  user_id: string
}

interface ToggleAdminParams {
  user_id: string
  make_admin: boolean
}

interface UseUserManagementReturn {
  isLoading: boolean
  updateUser: (params: UpdateUserParams) => Promise<boolean>
  deleteUser: (params: DeleteUserParams) => Promise<boolean>
  promoteToInstructor: (params: PromoteToInstructorParams) => Promise<boolean>
  demoteToPlayer: (params: DemoteToPlayerParams) => Promise<boolean>
  toggleAdmin: (params: ToggleAdminParams) => Promise<boolean>
}

/**
 * Hook para gerenciar operações administrativas de usuários
 * @returns objeto com funções de gerenciamento e estado de loading
 */
export function useUserManagement(): UseUserManagementReturn {
  const [isLoading, setIsLoading] = useState(false)

  const updateUser = async (params: UpdateUserParams): Promise<boolean> => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          operation: 'update_user',
          user_id: params.user_id,
          user_type: params.user_type,
          data: params.data
        }
      })

      if (error) {
        throw new Error(error.message || 'Erro ao atualizar usuário')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao atualizar usuário')
      }

      toast.success(data.message || 'Usuário atualizado com sucesso')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar usuário'
      console.error('❌ [useUserManagement] Erro ao atualizar:', error)
      toast.error(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const deleteUser = async (params: DeleteUserParams): Promise<boolean> => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          operation: 'delete_user',
          user_id: params.user_id,
          user_type: params.user_type
        }
      })

      if (error) {
        throw new Error(error.message || 'Erro ao excluir usuário')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao excluir usuário')
      }

      toast.success(data.message || 'Usuário excluído com sucesso')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir usuário'
      console.error('❌ [useUserManagement] Erro ao excluir:', error)
      toast.error(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const promoteToInstructor = async (params: PromoteToInstructorParams): Promise<boolean> => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          operation: 'promote_to_instructor',
          user_id: params.user_id
        }
      })

      if (error) {
        throw new Error(error.message || 'Erro ao promover a instrutor')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao promover a instrutor')
      }

      toast.success(data.message || 'Promovido a instrutor com sucesso')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao promover a instrutor'
      console.error('❌ [useUserManagement] Erro ao promover:', error)
      toast.error(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const demoteToPlayer = async (params: DemoteToPlayerParams): Promise<boolean> => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          operation: 'demote_to_player',
          user_id: params.user_id
        }
      })

      if (error) {
        throw new Error(error.message || 'Erro ao rebaixar a player')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao rebaixar a player')
      }

      toast.success(data.message || 'Rebaixado a player com sucesso')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao rebaixar a player'
      console.error('❌ [useUserManagement] Erro ao rebaixar:', error)
      toast.error(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAdmin = async (params: ToggleAdminParams): Promise<boolean> => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          operation: 'toggle_admin',
          user_id: params.user_id,
          data: {
            make_admin: params.make_admin
          }
        }
      })

      if (error) {
        throw new Error(error.message || 'Erro ao alterar status de admin')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao alterar status de admin')
      }

      toast.success(data.message || 'Status de admin alterado com sucesso')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao alterar status de admin'
      console.error('❌ [useUserManagement] Erro ao alterar admin:', error)
      toast.error(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    updateUser,
    deleteUser,
    promoteToInstructor,
    demoteToPlayer,
    toggleAdmin
  }
}
