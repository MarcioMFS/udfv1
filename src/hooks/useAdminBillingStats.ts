import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface MonthlyBillingStats {
  month: number
  year: number
  newInstructors: number
  newPlayers: number
  newClasses: number
  totalMatches: number
  totalInstructors: number
  totalPlayers: number
}

export function useAdminBillingStats(month: number, year: number) {
  const [stats, setStats] = useState<MonthlyBillingStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const start = new Date(year, month - 1, 1).toISOString()
      const end = new Date(year, month, 1).toISOString()

      const [
        { count: newInstructors },
        { count: newPlayers },
        { count: newClasses },
        { count: totalMatches },
        { count: totalInstructors },
        { count: totalPlayers },
      ] = await Promise.all([
        supabase
          .from('instructors')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start)
          .lt('created_at', end),
        supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start)
          .lt('created_at', end),
        supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start)
          .lt('created_at', end),
        supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start)
          .lt('created_at', end),
        supabase
          .from('instructors')
          .select('*', { count: 'exact', head: true })
          .lt('created_at', end),
        supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .lt('created_at', end),
      ])

      setStats({
        month,
        year,
        newInstructors: newInstructors ?? 0,
        newPlayers: newPlayers ?? 0,
        newClasses: newClasses ?? 0,
        totalMatches: totalMatches ?? 0,
        totalInstructors: totalInstructors ?? 0,
        totalPlayers: totalPlayers ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar estatísticas')
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading, error, refetch: fetchStats }
}

export interface YearlyBillingSummary {
  month: number
  newInstructors: number
  newPlayers: number
  newClasses: number
  totalMatches: number
}

export function useAdminYearlyBilling(year: number) {
  const [summary, setSummary] = useState<YearlyBillingSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchYearly = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const yearStart = new Date(year, 0, 1).toISOString()
      const yearEnd = new Date(year + 1, 0, 1).toISOString()

      const [
        { data: instructors },
        { data: players },
        { data: classes },
        { data: matches },
      ] = await Promise.all([
        supabase
          .from('instructors')
          .select('created_at')
          .gte('created_at', yearStart)
          .lt('created_at', yearEnd),
        supabase
          .from('players')
          .select('created_at')
          .gte('created_at', yearStart)
          .lt('created_at', yearEnd),
        supabase
          .from('classes')
          .select('created_at')
          .gte('created_at', yearStart)
          .lt('created_at', yearEnd),
        supabase
          .from('matches')
          .select('created_at')
          .gte('created_at', yearStart)
          .lt('created_at', yearEnd),
      ])

      const rows: YearlyBillingSummary[] = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const inMonth = (row: { created_at: string }) =>
          new Date(row.created_at).getMonth() + 1 === m

        return {
          month: m,
          newInstructors: (instructors ?? []).filter(inMonth).length,
          newPlayers: (players ?? []).filter(inMonth).length,
          newClasses: (classes ?? []).filter(inMonth).length,
          totalMatches: (matches ?? []).filter(inMonth).length,
        }
      })

      setSummary(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar resumo anual')
    } finally {
      setIsLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchYearly()
  }, [fetchYearly])

  return { summary, isLoading, error }
}
