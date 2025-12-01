import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Event } from '../types'
import { getInstructorIdByEmail } from '../utils/instructorUtils'

interface EventMatch {
  id: string
  match_date: string
  match_number: number
  player_id: string
  player_name: string
  player_email: string
  class_code: string
  app_serial: string
}

interface EventPlayer {
  player_id: string
  player?: {
    name: string
    email: string
  }
  total_matches: number
  avg_lucro: number
  avg_satisfaction: number
  avg_bonus: number
  total_profit: number
  last_match: string
  class_code: string
  class_description: string
}

interface EventStats {
  total_matches: number
  unique_players: number
  total_profit: number
  avg_satisfaction: number
  avg_bonus: number
  classes_count: number
  completion_rate: number
  best_player_total: number
  avg_matches_per_player: number
  engagement_rate: number
  total_days_active: number
}

interface UseEventDataReturn {
  eventData: Event | null
  matches: EventMatch[]
  players: EventPlayer[]
  stats: EventStats
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useEventData(eventId: string | undefined): UseEventDataReturn {
  const { user } = useAuth()
  const [eventData, setEventData] = useState<Event | null>(null)
  const [matches, setMatches] = useState<EventMatch[]>([])
  const [players, setPlayers] = useState<EventPlayer[]>([])
  const [stats, setStats] = useState<EventStats>({
    total_matches: 0,
    unique_players: 0,
    total_profit: 0,
    avg_satisfaction: 0,
    avg_bonus: 0,
    classes_count: 0,
    completion_rate: 0,
    best_player_total: 0,
    avg_matches_per_player: 0,
    engagement_rate: 0,
    total_days_active: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEventData = async () => {
    if (!user || !eventId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Buscar instructor_id baseado no email do usuário
      const instructorId = await getInstructorIdByEmail(user.email || '')

      if (!instructorId) {
        throw new Error('Instrutor não encontrado')
      }

      // Load event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('instructor_id', instructorId)
        .single()

      if (eventError) {
        throw new Error('Evento não encontrado ou sem permissão de acesso')
      }

      setEventData(eventData)

      // Load matches for this event
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          match_date,
          match_number,
          player_id,
          app_serial,
          players:player_id (
            name,
            email
          ),
          events!inner(
            class_id,
            classes:class_id (
              code
            )
          )
        `)
        .eq('event_id', eventId)
        .order('match_date', { ascending: false })

      if (matchesError) {
        console.warn('Error loading matches:', matchesError)
      }

      const formattedMatches: EventMatch[] = (matchesData || []).map(match => ({
        id: match.id,
        match_date: match.match_date,
        match_number: match.match_number,
        player_id: match.player_id,
        player_name: (match.players as any)?.name || 'Jogador',
        player_email: (match.players as any)?.email || '',
        class_code: (match.events as any)?.classes?.code || 'N/A',
        app_serial: match.app_serial
      }))

      setMatches(formattedMatches)

      // Load match results for this event
      const { data: resultsData, error: resultsError } = await supabase
        .from('match_results')
        .select(`
          player_id,
          lucro,
          satisfacao,
          bonus,
          created_at,
          match_number,
          event_id,
          players:player_id (
            name,
            email
          )
        `)
        .eq('event_id', eventId)
        .not('player_id', 'is', null)


      if (resultsError) {
        console.warn('Error loading match results:', resultsError)
      }

      // Process player statistics
      const playerStats = new Map<string, {
        id: string
        name: string
        email: string
        matches: number
        total_profit: number
        total_satisfaction: number
        total_bonus: number
        last_match: string
        class_code: string
        class_description: string
      }>()

      // Get class info for this event
      const { data: eventClassData } = await supabase
        .from('events')
        .select(`
          class_id,
          classes:class_id (
            code,
            description
          )
        `)
        .eq('id', eventId)
        .single()

      const eventClassCode = (eventClassData as any)?.classes?.code || 'N/A'
      const eventClassDescription = (eventClassData as any)?.classes?.description || ''

      // Process results
      ;(resultsData || []).forEach(result => {
        const playerId = result.player_id
        const playerName = (result.players as any)?.name || 'Jogador'
        const playerEmail = (result.players as any)?.email || ''

        if (!playerStats.has(playerId)) {
          playerStats.set(playerId, {
            id: playerId,
            name: playerName,
            email: playerEmail,
            matches: 0,
            total_profit: 0,
            total_satisfaction: 0,
            total_bonus: 0,
            last_match: result.created_at,
            class_code: eventClassCode,
            class_description: eventClassDescription
          })
        }

        const stats = playerStats.get(playerId)!
        stats.matches++
        stats.total_profit += result.lucro || 0
        stats.total_satisfaction += result.satisfacao || 0
        stats.total_bonus += result.bonus || 0
        
        if (new Date(result.created_at) > new Date(stats.last_match)) {
          stats.last_match = result.created_at
        }
      })

      const formattedPlayers: EventPlayer[] = Array.from(playerStats.values()).map(stats => ({
        player_id: stats.id,
        player: {
          name: stats.name,
          email: stats.email
        },
        total_matches: stats.matches,
        avg_lucro: stats.matches > 0 ? Math.round(stats.total_profit / stats.matches) : 0,
        avg_satisfaction: stats.matches > 0 ? Math.round(stats.total_satisfaction / stats.matches) : 0,
        avg_bonus: stats.matches > 0 ? Math.round(stats.total_bonus / stats.matches) : 0,
        total_profit: stats.total_profit,
        last_match: stats.last_match,
        class_code: stats.class_code,
        class_description: stats.class_description
      })).sort((a, b) => b.total_profit - a.total_profit)

      setPlayers(formattedPlayers)

      // Calculate overall stats
      const totalMatches = formattedMatches.length
      const uniquePlayers = playerStats.size
      const totalProfit = Array.from(playerStats.values()).reduce((sum, p) => sum + p.total_profit, 0)
      const avgSatisfaction = uniquePlayers > 0 
        ? Math.round(Array.from(playerStats.values()).reduce((sum, p) => sum + p.total_satisfaction, 0) / Array.from(playerStats.values()).reduce((sum, p) => sum + p.matches, 0))
        : 0
      const avgBonus = uniquePlayers > 0 
        ? Math.round(Array.from(playerStats.values()).reduce((sum, p) => sum + p.total_bonus, 0) / Array.from(playerStats.values()).reduce((sum, p) => sum + p.matches, 0))
        : 0

      // Calculate best player total (lucro + bonus)
      const bestPlayerTotal = Array.from(playerStats.values()).reduce((max, p) => {
        const playerTotal = p.matches > 0 ? Math.round((p.total_profit + p.total_bonus) / p.matches) : 0
        return playerTotal > max ? playerTotal : max
      }, 0)

      // Calculate average matches per player
      const avgMatchesPerPlayer = uniquePlayers > 0 ? totalMatches / uniquePlayers : 0

      // Count unique classes
      const uniqueClasses = new Set(formattedMatches.map(m => m.class_code)).size

      // Calculate engagement metrics
      const uniqueDates = new Set(formattedMatches.map(m => m.match_date.split('T')[0])).size
      const engagementRate = avgMatchesPerPlayer > 1 ? Math.min(100, Math.round(avgMatchesPerPlayer * 20)) : Math.round(avgMatchesPerPlayer * 100)

      setStats({
        total_matches: totalMatches,
        unique_players: uniquePlayers,
        total_profit: totalProfit,
        avg_satisfaction: avgSatisfaction,
        avg_bonus: avgBonus,
        classes_count: uniqueClasses,
        completion_rate: 0,
        best_player_total: bestPlayerTotal,
        avg_matches_per_player: avgMatchesPerPlayer,
        engagement_rate: engagementRate,
        total_days_active: uniqueDates
      })

    } catch (err) {
      console.error('Error loading event data:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados do evento')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user && eventId) {
      loadEventData()
    }
  }, [user, eventId])

  return {
    eventData,
    matches,
    players,
    stats,
    isLoading,
    error,
    refetch: loadEventData
  }
}