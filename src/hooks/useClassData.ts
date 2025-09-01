import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Class, Student, Team, MatchResult } from '../types'
import { useAuth } from '../contexts/AuthContext'

interface UseClassDataReturn {
  classData: Class | null
  students: Student[]
  teams: Team[]
  matchResults: MatchResult[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useClassData(classId: string | undefined): UseClassDataReturn {
  const { user } = useAuth()
  const [classData, setClassData] = useState<Class | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [matchResults, setMatchResults] = useState<MatchResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadClassData = async () => {
    if (!user || !classId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select(`
          *,
          influencers:influencer_id (name, email)
        `)
        .eq('id', classId)
        .eq('instructor_id', user.id)
        .single()

      // Load events associated with this class
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, subject, difficulty, code')
        .eq('class_id', classId)

      if (eventsError) {
        console.warn('Error loading events for class:', eventsError)
      }

      if (classError) {
        throw new Error('Erro ao carregar dados da turma')
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from('class_players')
        .select(`
          *,
          players:player_id (id, name, email, purpose, color, team_id)
        `)
        .eq('class_id', classId)

      if (studentsError) {
        throw new Error('Erro ao carregar estudantes')
      }

      const { data: matchResultsData, error: matchResultsError } = await supabase
        .from('match_results')
        .select(`
          player_id,
          event_id,
          match_number,
          lucro,
          satisfacao,
          bonus,
          created_at,
          players:player_id (name, email, purpose),
          events!inner(class_id)
        `)
        .eq('events.class_id', classId)
        .not('player_id', 'is', null)


      if (matchResultsError) {
        throw new Error('Erro ao carregar resultados das partidas')
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('class_id', classId)

      if (teamsError) {
        throw new Error('Erro ao carregar times')
      }

      const formattedStudents = (studentsData || []).map(item => ({
        id: item.players?.id || '',
        name: item.players?.name || null,
        email: item.players?.email || null,
        joined_at: item.joined_at,
        total_matches: item.total_matches || 0,
        avg_score: item.avg_score || 0,
        purpose: item.players?.purpose || null,
        color: item.players?.color || 1,
        team_id: item.players?.team_id || null
      }))

      const formattedMatchResults = (matchResultsData || []).map(result => ({
        ...result,
        player: Array.isArray(result.players) ? result.players[0] : result.players
      }))

      const teamsWithMembers = (teamsData || []).map(team => ({
        ...team,
        members: formattedStudents.filter(student => student.team_id === team.id)
      }))

      setClassData({
        ...classData,
        events: eventsData || [],
        influencer: Array.isArray(classData.influencers) ? classData.influencers[0] : classData.influencers,
        instructor: {
          name: (user as any)?.user_metadata?.name || user.email || 'Instrutor',
          email: user.email || ''
        }
      })
      setStudents(formattedStudents)
      setMatchResults(formattedMatchResults)
      setTeams(teamsWithMembers)

    } catch (err) {
      console.error('Error loading class data:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user && classId) {
      loadClassData()
    }
  }, [user, classId])

  return {
    classData,
    students,
    teams,
    matchResults,
    isLoading,
    error,
    refetch: loadClassData
  }
}