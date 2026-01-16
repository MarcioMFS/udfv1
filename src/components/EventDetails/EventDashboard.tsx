import { useState, useEffect } from 'react'
import { 
  Users, 
  DollarSign, 
  Activity, 
  Zap,
  Trophy,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Info
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface EventStats {
  total_matches: number
  unique_players: number
  total_profit: number
  avg_satisfaction: number
  avg_bonus: number
  engagement_rate: number
  avg_matches_per_player: number
}

interface EventComparison {
  current: EventStats
  previous: EventStats | null
  classAverage: EventStats | null
}

interface EventDashboardProps {
  eventId: string
  classId: string
  stats: EventStats
}

export function EventDashboard({ eventId, classId, stats }: EventDashboardProps) {
  const { user } = useAuth()
  const [comparison, setComparison] = useState<EventComparison>({
    current: stats,
    previous: null,
    classAverage: null
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadComparisonData()
  }, [eventId, classId])

  const loadComparisonData = async () => {
    if (!user || !classId) return

    try {
      // 1. Buscar eventos anteriores da mesma turma
      const { data: events } = await supabase
        .from('events')
        .select('id, name, created_at')
        .eq('class_id', classId)
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      const currentEventIndex = events?.findIndex(e => e.id === eventId) || 0
      const previousEvent = events?.[currentEventIndex + 1]

      // 2. Calcular stats do evento anterior
      let previousStats = null
      if (previousEvent) {
        previousStats = await calculateEventStats(previousEvent.id)
      }

      // 3. Calcular média da turma (todos os eventos)
      const classAverage = await calculateClassAverageStats(classId)

      setComparison({
        current: stats,
        previous: previousStats,
        classAverage
      })
    } catch (error) {
      console.error('Error loading comparison data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateEventStats = async (eventId: string): Promise<EventStats> => {
    const { data: matchResults } = await supabase
      .from('match_results')
      .select(`
        player_id,
        lucro,
        satisfacao,
        bonus,
        bonus_money,
        match_number,
        events!inner(id)
      `)
      .eq('events.id', eventId)

    if (!matchResults?.length) {
      return {
        total_matches: 0,
        unique_players: 0,
        total_profit: 0,
        avg_satisfaction: 0,
        avg_bonus: 0,
        engagement_rate: 0,
        avg_matches_per_player: 0
      }
    }

    const uniquePlayers = [...new Set(matchResults.map(r => r.player_id))].length
    const totalMatches = matchResults.length
    const totalProfit = matchResults.reduce((sum, r) => sum + (r.lucro || 0), 0)
    const avgSatisfaction = matchResults.reduce((sum, r) => sum + (r.satisfacao || 0), 0) / totalMatches
    const avgBonus = matchResults.reduce((sum, r) => sum + (r.bonus_money || 0), 0) / totalMatches

    // Calcular engajamento baseado na turma
    const { data: classPlayers } = await supabase
      .from('class_players')
      .select('player_id')
      .eq('class_id', (await supabase.from('events').select('class_id').eq('id', eventId).single()).data?.class_id)

    const totalClassPlayers = classPlayers?.length || 1
    const uniqueMatches = [...new Set(matchResults.map(r => r.match_number))].length
    const maxPossibleParticipations = totalClassPlayers * uniqueMatches
    const engagementRate = maxPossibleParticipations > 0 
      ? Math.round((totalMatches / maxPossibleParticipations) * 100) 
      : 0

    return {
      total_matches: totalMatches,
      unique_players: uniquePlayers,
      total_profit: totalProfit,
      avg_satisfaction: Math.round(avgSatisfaction),
      avg_bonus: Math.round(avgBonus),
      engagement_rate: engagementRate,
      avg_matches_per_player: uniquePlayers > 0 ? Math.round(totalMatches / uniquePlayers) : 0
    }
  }

  const calculateClassAverageStats = async (classId: string): Promise<EventStats> => {
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('class_id', classId)
      .eq('instructor_id', user!.id)

    if (!events?.length) return comparison.current

    const allStats = await Promise.all(
      events.map(event => calculateEventStats(event.id))
    )

    const validStats = allStats.filter(stat => stat.total_matches > 0)
    if (validStats.length === 0) return comparison.current

    return {
      total_matches: Math.round(validStats.reduce((sum, s) => sum + s.total_matches, 0) / validStats.length),
      unique_players: Math.round(validStats.reduce((sum, s) => sum + s.unique_players, 0) / validStats.length),
      total_profit: Math.round(validStats.reduce((sum, s) => sum + s.total_profit, 0) / validStats.length),
      avg_satisfaction: Math.round(validStats.reduce((sum, s) => sum + s.avg_satisfaction, 0) / validStats.length),
      avg_bonus: Math.round(validStats.reduce((sum, s) => sum + s.avg_bonus, 0) / validStats.length),
      engagement_rate: Math.round(validStats.reduce((sum, s) => sum + s.engagement_rate, 0) / validStats.length),
      avg_matches_per_player: Math.round(validStats.reduce((sum, s) => sum + s.avg_matches_per_player, 0) / validStats.length)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getComparisonIcon = (current: number, previous: number | null) => {
    if (!previous) return <Minus className="w-4 h-4 text-gray-400" />
    if (current > previous) return <ArrowUp className="w-4 h-4 text-green-500" />
    if (current < previous) return <ArrowDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  const getComparisonColor = (current: number, previous: number | null) => {
    if (!previous) return 'text-gray-500'
    if (current > previous) return 'text-green-600'
    if (current < previous) return 'text-red-600'
    return 'text-gray-500'
  }

  const getComparisonText = (current: number, previous: number | null) => {
    if (!previous) return 'Primeiro evento'
    const diff = current - previous
    const percentage = previous > 0 ? Math.round((diff / previous) * 100) : 0
    return `${diff > 0 ? '+' : ''}${percentage}% vs anterior`
  }

  const statCards = [
    {
      icon: Activity,
      label: 'Total de Partidas',
      value: comparison.current.total_matches,
      format: (v: number) => v.toString(),
      color: 'blue',
      tooltip: 'Total de partidas jogadas neste evento específico'
    },
    {
      icon: Users,
      label: 'Jogadores Únicos',
      value: comparison.current.unique_players,
      format: (v: number) => v.toString(),
      color: 'purple',
      tooltip: 'Número de jogadores que participaram deste evento'
    },
    {
      icon: DollarSign,
      label: 'Lucro Total',
      value: comparison.current.total_profit,
      format: formatCurrency,
      color: 'green',
      tooltip: 'Soma de todo o lucro gerado neste evento'
    },
    {
      icon: Target,
      label: 'Satisfação Média',
      value: comparison.current.avg_satisfaction,
      format: (v: number) => `${v}%`,
      color: 'yellow',
      tooltip: 'Média de satisfação de todos os jogadores neste evento'
    },
    {
      icon: Trophy,
      label: 'Bônus Médio',
      value: comparison.current.avg_bonus,
      format: formatCurrency,
      color: 'orange',
      tooltip: 'Média de bônus conquistado neste evento'
    },
    {
      icon: Zap,
      label: 'Taxa de Engajamento',
      value: comparison.current.engagement_rate,
      format: (v: number) => `${v}%`,
      color: 'indigo',
      tooltip: 'Percentual de participação real vs. potencial máximo'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-500' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', icon: 'text-purple-500' },
      green: { bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-500' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: 'text-yellow-500' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', icon: 'text-orange-500' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', icon: 'text-indigo-500' }
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 w-full overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="w-16 h-8 bg-gray-200 rounded"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
              <div className="w-20 h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 w-full overflow-hidden">
      {statCards.map((card, index) => {
        const IconComponent = card.icon
        const colors = getColorClasses(card.color)
        const previousValue = comparison.previous ? 
          (card.label === 'Total de Partidas' ? comparison.previous.total_matches :
           card.label === 'Jogadores Únicos' ? comparison.previous.unique_players :
           card.label === 'Lucro Total' ? comparison.previous.total_profit :
           card.label === 'Satisfação Média' ? comparison.previous.avg_satisfaction :
           card.label === 'Bônus Médio' ? comparison.previous.avg_bonus :
           comparison.previous.engagement_rate) : null

        return (
          <div key={index} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow w-full overflow-hidden">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
                <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.icon}`} />
              </div>
              <div className="group relative cursor-help">
                <Info className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                  {card.tooltip}
                </div>
              </div>
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <div className={`text-lg sm:text-2xl font-bold ${colors.text} break-words`}>
                {card.format(card.value)}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-600">
                {card.label}
              </div>
              <div className={`flex items-center gap-1 text-xs ${getComparisonColor(card.value, previousValue)}`}>
                {getComparisonIcon(card.value, previousValue)}
                <span className="truncate">{getComparisonText(card.value, previousValue)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}