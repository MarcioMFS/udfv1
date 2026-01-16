import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Zap,
  HelpCircle
} from 'lucide-react'

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

interface EventStatsCardsProps {
  stats: EventStats
}

export function EventStatsCards({ stats }: EventStatsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const statCards = [
    {
      icon: Activity,
      label: 'Total de Partidas',
      value: stats.total_matches.toString(),
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      tooltip: 'Soma de todas as partidas jogadas por todos os jogadores neste evento'
    },
    {
      icon: Users,
      label: 'Jogadores Únicos',
      value: stats.unique_players.toString(),
      color: 'bg-green-500',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      tooltip: 'Número de pessoas diferentes que já participaram do evento, independente de quantas partidas jogaram'
    },
    {
      icon: DollarSign,
      label: 'Lucro Total',
      value: formatCurrency(stats.total_profit),
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600',
      tooltip: 'Soma de todo o lucro gerado por todos os jogadores em todas as partidas'
    },
    {
      icon: TrendingUp,
      label: 'Satisfação Média',
      value: `${stats.avg_satisfaction}%`,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
      tooltip: 'Média do nível de satisfação reportado pelos jogadores em todas as partidas'
    },
    {
      icon: Zap,
      label: 'Taxa de Engajamento',
      value: `${stats.engagement_rate}%`,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-600',
      tooltip: 'Porcentagem de engajamento calculada com base na participação média dos jogadores'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
      {statCards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 relative">
          <div className="absolute top-4 right-4 group">
            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max max-w-[200px] sm:max-w-xs px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
              {card.tooltip}
            </div>
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.textColor}`} />
            </div>
          </div>
          <div>
            <p className="text-xl lg:text-2xl font-bold text-gray-800 mb-1 break-words">{card.value}</p>
            <p className="text-xs lg:text-sm text-gray-600 line-clamp-2">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}