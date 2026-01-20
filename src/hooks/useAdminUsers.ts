import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Player {
  id: string
  name: string
  email: string
  created_at: string
  updated_at: string
  userType: 'player'
}

export interface Instructor {
  id: string
  name: string
  email: string
  is_admin: boolean
  created_at: string
  updated_at: string
  userType: 'instructor'
}

export type User = Player | Instructor

interface UseAdminUsersReturn {
  players: Player[]
  instructors: Instructor[]
  admins: Instructor[]
  allUsers: User[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook para buscar todos os usuários do sistema (apenas para admins)
 * @returns objeto com players, instructors, admins, allUsers, isLoading, error e refresh
 */
export function useAdminUsers(): UseAdminUsersReturn {
  const [players, setPlayers] = useState<Player[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [admins, setAdmins] = useState<Instructor[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true })

      if (playersError) throw playersError

      // Fetch instructors
      const { data: instructorsData, error: instructorsError } = await supabase
        .from('instructors')
        .select('*')
        .order('name', { ascending: true })

      if (instructorsError) throw instructorsError

      // Process data
      const playersWithType: Player[] = (playersData || []).map(p => ({
        ...p,
        userType: 'player' as const
      }))

      const instructorsWithType: Instructor[] = (instructorsData || []).map(i => ({
        ...i,
        userType: 'instructor' as const
      }))

      const adminsData = instructorsWithType.filter(i => i.is_admin)

      // Combine all users
      const combined: User[] = [...playersWithType, ...instructorsWithType]

      setPlayers(playersWithType)
      setInstructors(instructorsWithType)
      setAdmins(adminsData)
      setAllUsers(combined)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar usuários'
      console.error('❌ [useAdminUsers] Erro:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return {
    players,
    instructors,
    admins,
    allUsers,
    isLoading,
    error,
    refresh: fetchUsers
  }
}
