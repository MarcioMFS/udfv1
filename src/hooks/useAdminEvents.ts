import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export interface AdminEvent {
  id: string
  title: string
  date: string
  location: string
  description: string | null
  instructor_id: string
  class_id: string
  created_at: string
  updated_at: string
  instructor?: {
    id: string
    name: string
    email: string
  }
  class?: {
    id: string
    name: string
  }
}

interface ReassignEventParams {
  event_id: string
  new_instructor_id: string
}

interface UpdateEventParams {
  event_id: string
  data: {
    title?: string
    date?: string
    location?: string
    description?: string
  }
}

interface DeleteEventParams {
  event_id: string
}

interface UseAdminEventsReturn {
  events: AdminEvent[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  reassignEvent: (params: ReassignEventParams) => Promise<boolean>
  updateEvent: (params: UpdateEventParams) => Promise<boolean>
  deleteEvent: (params: DeleteEventParams) => Promise<boolean>
}

/**
 * Hook para buscar e gerenciar todos os eventos do sistema (apenas para admins)
 * @returns objeto com eventos, isLoading, error, refresh e funções de gerenciamento
 */
export function useAdminEvents(): UseAdminEventsReturn {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-event-management', {
        body: {
          operation: 'list_all_events'
        }
      })

      if (invokeError) {
        throw new Error(invokeError.message || 'Erro ao buscar eventos')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao buscar eventos')
      }

      setEvents(data.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar eventos'
      console.error('❌ [useAdminEvents] Erro:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const reassignEvent = async (params: ReassignEventParams): Promise<boolean> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-event-management', {
        body: {
          operation: 'reassign_event',
          event_id: params.event_id,
          new_instructor_id: params.new_instructor_id
        }
      })

      if (invokeError) {
        throw new Error(invokeError.message || 'Erro ao reatribuir evento')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao reatribuir evento')
      }

      toast.success(data.message || 'Evento reatribuído com sucesso')
      await fetchEvents() // Refresh events
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao reatribuir evento'
      console.error('❌ [useAdminEvents] Erro ao reatribuir:', error)
      toast.error(errorMessage)
      return false
    }
  }

  const updateEvent = async (params: UpdateEventParams): Promise<boolean> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-event-management', {
        body: {
          operation: 'update_event',
          event_id: params.event_id,
          data: params.data
        }
      })

      if (invokeError) {
        throw new Error(invokeError.message || 'Erro ao atualizar evento')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao atualizar evento')
      }

      toast.success(data.message || 'Evento atualizado com sucesso')
      await fetchEvents() // Refresh events
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar evento'
      console.error('❌ [useAdminEvents] Erro ao atualizar:', error)
      toast.error(errorMessage)
      return false
    }
  }

  const deleteEvent = async (params: DeleteEventParams): Promise<boolean> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-event-management', {
        body: {
          operation: 'delete_event',
          event_id: params.event_id
        }
      })

      if (invokeError) {
        throw new Error(invokeError.message || 'Erro ao excluir evento')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao excluir evento')
      }

      toast.success(data.message || 'Evento excluído com sucesso')
      await fetchEvents() // Refresh events
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir evento'
      console.error('❌ [useAdminEvents] Erro ao excluir:', error)
      toast.error(errorMessage)
      return false
    }
  }

  return {
    events,
    isLoading,
    error,
    refresh: fetchEvents,
    reassignEvent,
    updateEvent,
    deleteEvent
  }
}
