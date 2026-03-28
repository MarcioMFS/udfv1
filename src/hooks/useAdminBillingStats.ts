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

async function getTestClassIds(): Promise<string[]> {
  const { data } = await supabase.from('classes').select('id').eq('is_test', true)
  return (data ?? []).map((c: { id: string }) => c.id)
}

function applyTestClassFilter<T>(
  query: T,
  testIds: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (testIds.length === 0) return query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (query as any).not('class_id', 'in', `(${testIds.join(',')})`)
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

      const testIds = await getTestClassIds()

      let matchesMonthQuery = supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start)
        .lt('created_at', end)
      matchesMonthQuery = applyTestClassFilter(matchesMonthQuery, testIds)

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
          .lt('created_at', end)
          .neq('is_test', true),
        matchesMonthQuery,
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

      const testIds = await getTestClassIds()

      let matchesYearQuery = supabase
        .from('matches')
        .select('created_at')
        .gte('created_at', yearStart)
        .lt('created_at', yearEnd)
      matchesYearQuery = applyTestClassFilter(matchesYearQuery, testIds)

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
          .lt('created_at', yearEnd)
          .neq('is_test', true),
        matchesYearQuery,
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

// ── Detail lists ────────────────────────────────────────────────────────────

export interface BillingInstructor {
  id: string
  name: string
  email: string
}

export interface BillingPlayer {
  id: string
  name: string
  email: string
  instructorName: string | null
  className: string | null
  isTestOnly: boolean
}

type RawClassPlayer = {
  classes: {
    id: string
    description: string | null
    is_test: boolean | null
    instructors: { name: string } | null
  } | null
}

type RawPlayer = {
  id: string
  name: string
  email: string
  class_players: RawClassPlayer[]
}

export function useAdminBillingDetails(month: number, year: number) {
  const [instructors, setInstructors] = useState<BillingInstructor[]>([])
  const [players, setPlayers] = useState<BillingPlayer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchDetails = useCallback(async () => {
    setIsLoading(true)
    try {
      const start = new Date(year, month - 1, 1).toISOString()
      const end = new Date(year, month, 1).toISOString()

      const [{ data: instructorData }, { data: playerData }] = await Promise.all([
        supabase
          .from('instructors')
          .select('id, name, email')
          .gte('created_at', start)
          .lt('created_at', end)
          .order('name'),
        supabase
          .from('players')
          .select(`
            id, name, email,
            class_players(
              classes(
                id, description, is_test,
                instructors:instructor_id(name)
              )
            )
          `)
          .gte('created_at', start)
          .lt('created_at', end)
          .order('name'),
      ])

      setInstructors(
        (instructorData ?? []).map((i: BillingInstructor) => ({
          id: i.id,
          name: i.name,
          email: i.email,
        }))
      )

      const processed: BillingPlayer[] = ((playerData ?? []) as unknown as RawPlayer[]).map(p => {
        const enrollments = p.class_players ?? []
        const realEnrollment = enrollments.find(e => e.classes && !e.classes.is_test)
        const anyEnrollment = enrollments[0]
        const allTest =
          enrollments.length > 0 && enrollments.every(e => e.classes?.is_test === true)

        const target = realEnrollment ?? anyEnrollment
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          instructorName: target?.classes?.instructors?.name ?? null,
          className: target?.classes?.description ?? null,
          isTestOnly: allTest,
        }
      })

      setPlayers(processed)
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  return { instructors, players, isLoading }
}
