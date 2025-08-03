import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { InstructorStats } from '../types/badges'

export interface SimpleBadge {
  id: string
  title: string
  achieved: boolean
  requirement: number
  current: number
}

type InstructorStatsData = Pick<InstructorStats, 'classes' | 'students' | 'matches' | 'events' | 'leaders' | 'totalProfit' | 'packagesSold' | 'engagement' | 'pioneerRank' | 'top10Classes' | 'top5Classes' | 'top3Classes'>

interface UseInstructorStatsReturn {
  stats: InstructorStatsData
  badges: SimpleBadge[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useInstructorStats(): UseInstructorStatsReturn {
  const { user, isLoading: authLoading } = useAuth()

  const [stats, setStats] = useState<InstructorStatsData>({
    classes: 0,
    students: 0,
    matches: 0,
    events: 0,
    leaders: 0,
    totalProfit: 0,
    packagesSold: 0,
    engagement: 0,
    pioneerRank: 0,
    top10Classes: 0,
    top5Classes: 0,
    top3Classes: 0
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const calculateBadges = (stats: InstructorStatsData): SimpleBadge[] => {
    return [
      {
        id: 'classes-badge',
        title: 'Formador de Turmas',
        achieved: stats.classes >= 5,
        requirement: 5,
        current: stats.classes
      },
      {
        id: 'students-badge',
        title: 'Mentor de Alunos',
        achieved: stats.students >= 10,
        requirement: 10,
        current: stats.students
      },
      {
        id: 'matches-badge',
        title: 'Facilitador de Jogos',
        achieved: stats.matches >= 3,
        requirement: 3,
        current: stats.matches
      },
      {
        id: 'events-badge',
        title: 'Organizador de Eventos',
        achieved: stats.events >= 2,
        requirement: 2,
        current: stats.events
      }
    ]
  }

  const loadStats = async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Try to get from instructor_stats table first
      const { data: statsData, error: statsError } = await supabase
        .from('instructor_stats')
        .select('*')
        .eq('instructor_id', user.id)
        .single()

      if (statsData && !statsError) {
        setStats({
          classes: statsData.classes || 0,
          students: statsData.students || 0,
          matches: statsData.matches || 0,
          events: statsData.events || 0,
          leaders: statsData.leaders || 0,
          totalProfit: statsData.totalprofit || 0,
          packagesSold: statsData.packagessold || 0,
          engagement: statsData.engagement || 0,
          pioneerRank: statsData.pioneerrank || 0,
          top10Classes: statsData.top10classes || 0,
          top5Classes: statsData.top5classes || 0,
          top3Classes: statsData.top3classes || 0
        })
      } else {
        // Show zeros when table is empty or no data found
        setStats({
          classes: 0,
          students: 0,
          matches: 0,
          events: 0,
          leaders: 0,
          totalProfit: 0,
          packagesSold: 0,
          engagement: 0,
          pioneerRank: 0,
          top10Classes: 0,
          top5Classes: 0,
          top3Classes: 0
        })
      }
    } catch (err) {
      console.error('Error loading instructor stats:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas')
      
      // Show zeros on error instead of fallback calculations
      setStats({
        classes: 0,
        students: 0,
        matches: 0,
        events: 0,
        leaders: 0,
        totalProfit: 0,
        packagesSold: 0,
        engagement: 0,
        pioneerRank: 0,
        top10Classes: 0,
        top5Classes: 0,
        top3Classes: 0
      })
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
    badges: calculateBadges(stats),
    isLoading,
    error,
    refetch: loadStats
  }
}