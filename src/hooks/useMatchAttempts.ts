import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export type MatchAttemptReason = 'email_not_found' | 'not_enrolled' | 'event_not_found'
export type MatchAttemptStatus = 'pending' | 'resolved' | 'ignored' | 'flagged'

export interface MatchAttempt {
  id: string
  player_email: string
  event_code: string
  app_serial: string | null
  match_number: number | null
  lucro: number | null
  satisfacao: number | null
  bonus_money: number | null
  event_id: string | null
  class_id: string | null
  instructor_id: string | null
  reason: MatchAttemptReason
  status: MatchAttemptStatus
  resolved_player_id: string | null
  resolved_by: string | null
  resolved_at: string | null
  admin_note: string | null
  created_at: string
  // relações (embedding do PostgREST)
  instructors?: { name: string | null; email: string | null } | null
  classes?: { code: string | null; description: string | null } | null
  events?: { name: string | null; code: string | null } | null
}

export interface ClassStudent {
  id: string
  name: string | null
  email: string | null
}

interface ReprocessResult {
  success: boolean
  message: string
}

interface UseMatchAttemptsReturn {
  attempts: MatchAttempt[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateStatus: (id: string, status: MatchAttemptStatus, note?: string) => Promise<boolean>
  fetchClassStudents: (classId: string) => Promise<ClassStudent[]>
  reprocess: (attemptId: string, targetEmail: string) => Promise<ReprocessResult>
}

/**
 * Tentativas de partida rejeitadas por identificação (email errado / não inscrito).
 * Somente admin lê e gerencia (RLS na tabela match_attempts).
 */
export function useMatchAttempts(): UseMatchAttemptsReturn {
  const [attempts, setAttempts] = useState<MatchAttempt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAttempts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('match_attempts')
        .select(`
          *,
          instructors ( name, email ),
          classes ( code, description ),
          events ( name, code )
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setAttempts((data as MatchAttempt[]) || [])
    } catch (err) {
      console.error('Erro ao buscar tentativas de partida:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar tentativas')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAttempts()
  }, [fetchAttempts])

  const updateStatus = useCallback(
    async (id: string, status: MatchAttemptStatus, note?: string): Promise<boolean> => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        const patch: Record<string, unknown> = {
          status,
          resolved_at: status === 'pending' ? null : new Date().toISOString(),
          resolved_by: status === 'pending' ? null : userData?.user?.id ?? null
        }
        if (note !== undefined) patch.admin_note = note

        const { error: updateError } = await supabase
          .from('match_attempts')
          .update(patch)
          .eq('id', id)

        if (updateError) throw updateError

        // atualiza local sem refetch completo
        setAttempts(prev =>
          prev.map(a =>
            a.id === id
              ? { ...a, ...(patch as Partial<MatchAttempt>) }
              : a
          )
        )
        return true
      } catch (err) {
        console.error('Erro ao atualizar tentativa:', err)
        return false
      }
    },
    []
  )

  // Alunos inscritos na turma da tentativa — para o admin escolher o dono da partida.
  const fetchClassStudents = useCallback(async (classId: string): Promise<ClassStudent[]> => {
    const { data, error: fetchError } = await supabase
      .from('class_players')
      .select('players ( id, name, email )')
      .eq('class_id', classId)

    if (fetchError) {
      console.error('Erro ao buscar alunos da turma:', fetchError)
      return []
    }
    return (data || [])
      .map((row: any) => row.players)
      .filter((p: any): p is ClassStudent => !!p)
      .sort((a: ClassStudent, b: ClassStudent) => (a.name || '').localeCompare(b.name || ''))
  }, [])

  // Reenvia a partida guardada ao create-match com o email do aluno certo.
  const reprocess = useCallback(async (attemptId: string, targetEmail: string): Promise<ReprocessResult> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('admin-reprocess-attempt', {
        body: { attempt_id: attemptId, target_email: targetEmail }
      })
      if (fnError) {
        // erros de negocio vem no corpo (data.error) mesmo com status != 2xx
        const msg = (data && (data.error as string)) || fnError.message || 'Falha ao reprocessar.'
        return { success: false, message: msg }
      }
      if (!data?.success) {
        return { success: false, message: data?.error || 'Falha ao reprocessar.' }
      }
      setAttempts(prev =>
        prev.map(a =>
          a.id === attemptId
            ? { ...a, status: 'resolved', resolved_at: new Date().toISOString() }
            : a
        )
      )
      return { success: true, message: data.message || 'Partida reprocessada.' }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Erro inesperado.' }
    }
  }, [])

  return { attempts, isLoading, error, refresh: fetchAttempts, updateStatus, fetchClassStudents, reprocess }
}
