import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export type EmailOperation =
  | 'send_announcement'
  | 'send_event_reminder'
  | 'send_event_date_change'
  | 'resend_first_access'
  | 'resend_password_reset'

export type RecipientType = 'all_players' | 'all_instructors' | 'by_class' | 'specific_user'

export interface DispatchEmailParams {
  operation: EmailOperation
  // Comunicado livre
  recipient_type?: RecipientType
  class_id?: string
  user_id?: string
  subject?: string
  body?: string
  // Evento
  event_id?: string
  new_date?: string
}

interface DispatchResult {
  success: boolean
  sent: number
  message: string
}

export function useEmailManagement() {
  const [isLoading, setIsLoading] = useState(false)

  const dispatch = async (params: DispatchEmailParams): Promise<boolean> => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-email-management', {
        body: params,
      })

      if (error) throw new Error(error.message)

      const result = data as DispatchResult

      if (!result?.success) {
        throw new Error(result?.message || 'Erro ao enviar email')
      }

      toast.success(result.message ?? `Email(s) enviado(s) com sucesso`)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(`Erro ao enviar: ${msg}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, dispatch }
}
