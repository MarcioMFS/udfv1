import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export type EmailOperation =
  | 'send_announcement'
  | 'send_event_reminder'
  | 'send_event_date_change'
  | 'resend_first_access'
  | 'resend_password_reset'
  | 'invite_instructor'
  | 'send_bulk_emails'

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
  // Convite instrutor
  instructor_name?: string
  instructor_email?: string
  // Emails em massa
  emails?: string[]
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

      // Se há erro, tenta extrair a mensagem real da resposta
      if (error) {
        // O erro pode conter a resposta JSON da função
        const errorData = data as { error?: string; message?: string } | null
        const errorMsg = errorData?.error || errorData?.message || error.message
        throw new Error(errorMsg)
      }

      const result = data as DispatchResult

      if (!result?.success) {
        // Captura erro ou message do resultado
        const errorMsg = (data as any)?.error || result?.message || 'Erro ao enviar email'
        throw new Error(errorMsg)
      }

      toast.success(result.message ?? `Email(s) enviado(s) com sucesso`)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useEmailManagement] Erro:', err)
      toast.error(`Erro: ${msg}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, dispatch }
}
