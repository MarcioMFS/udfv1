import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export type DashboardStats = {
  classes: number
  events: number
  students: number
  matches: number
  leaders: number
  totalProfit: number
  packagesSold: number
  engagement: number
}

interface UseDashboardStatsReturn {
  stats: DashboardStats
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const { user, isLoading: authLoading } = useAuth()

  const [stats, setStats] = useState<DashboardStats>({
    classes: 0,
    events: 0,
    students: 0,
    matches: 0,
    leaders: 0,
    totalProfit: 0,
    packagesSold: 0,
    engagement: 0
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Contagem de turmas
      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('instructor_id', user.id)

      // Contagem de eventos
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('instructor_id', user.id)

      // IDs das turmas
      const { data: classIds } = await supabase
        .from('classes')
        .select('id')
        .eq('instructor_id', user.id)

      let studentsCount = 0
      let matchesCount = 0
      let leadersCount = 0
      let totalProfit = 0
      let packagesSoldCount = 0
      let engagementAverage = 0

      if (classIds?.length) {
        const ids = classIds.map(c => c.id)

        // Contagem de alunos
        const { count } = await supabase
          .from('class_players')
          .select('*', { count: 'exact', head: true })
          .in('class_id', ids)

        studentsCount = count || 0

        // Contagem de partidas
        const { count: matches } = await supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .in('class_id', ids)

        matchesCount = matches || 0

        // Contagem de líderes
        const { count: leaders } = await supabase
          .from('leaders')
          .select('*', { count: 'exact', head: true })
          .in('class_id', ids)

        leadersCount = leaders || 0

        // Total de lucro
        const { data: profitsData } = await supabase
          .from('student_profits')
          .select('profit')
          .in('class_id', ids)

        totalProfit = profitsData?.reduce((acc, curr) => acc + (curr.profit || 0), 0) || 0

        // Pacotes vendidos
        const { count: packagesSold } = await supabase
          .from('sales')
          .select('*', { count: 'exact', head: true })
          .eq('instructor_id', user.id)

        packagesSoldCount = packagesSold || 0

        // Engajamento médio
        const { data: engagementData } = await supabase
          .from('class_engagement')
          .select('engagement')
          .in('class_id', ids)

        const engagementTotal =
          engagementData?.reduce((sum, row) => sum + (row.engagement || 0), 0) || 0

        engagementAverage = engagementData?.length
          ? Math.round(engagementTotal / engagementData.length)
          : 0
      }

      setStats({
        classes: classesCount || 0,
        events: eventsCount || 0,
        students: studentsCount,
        matches: matchesCount,
        leaders: leadersCount,
        totalProfit,
        packagesSold: packagesSoldCount,
        engagement: engagementAverage
      })
    } catch (err) {
      console.error('Error loading dashboard stats:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (user?.id) {
      loadStats()
    } else {
      setIsLoading(false)
    }
  }, [authLoading, user?.id])

  return {
    stats,
    isLoading,
    error,
    refetch: loadStats
  }
}