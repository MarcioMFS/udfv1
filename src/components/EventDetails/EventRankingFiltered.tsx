import { useState } from 'react'
import { Trophy, Medal, Crown, User, TrendingUp, DollarSign, Target, Award } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CustomTooltip } from '../ui/CustomTooltip'

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

interface EventRankingFilteredProps {
  players: EventPlayer[]
}

type RankingType = 'lucro' | 'satisfacao' | 'bonus' | 'matches'

export function EventRankingFiltered({ players }: EventRankingFilteredProps) {
  const [rankingType, setRankingType] = useState<RankingType>('lucro')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getSortedPlayers = () => {
    const sortedPlayers = [...players]
    
    switch (rankingType) {
      case 'lucro':
        return sortedPlayers.sort((a, b) => b.total_profit - a.total_profit)
      case 'satisfacao':
        return sortedPlayers.sort((a, b) => b.avg_satisfaction - a.avg_satisfaction)
      case 'bonus':
        return sortedPlayers.sort((a, b) => b.avg_bonus - a.avg_bonus)
      case 'matches':
        return sortedPlayers.sort((a, b) => b.total_matches - a.total_matches)
      default:
        return sortedPlayers.sort((a, b) => b.total_profit - a.total_profit)
    }
  }

  const getPlayerValue = (player: EventPlayer) => {
    switch (rankingType) {
      case 'lucro':
        return formatCurrency(player.total_profit)
      case 'satisfacao':
        return `${player.avg_satisfaction}%`
      case 'bonus':
        return formatCurrency(player.avg_bonus)
      case 'matches':
        return `${player.total_matches} partidas`
      default:
        return formatCurrency(player.total_profit)
    }
  }

  const getRankingIcon = () => {
    switch (rankingType) {
      case 'lucro':
        return <DollarSign className="w-5 h-5" />
      case 'satisfacao':
        return <Target className="w-5 h-5" />
      case 'bonus':
        return <Award className="w-5 h-5" />
      case 'matches':
        return <TrendingUp className="w-5 h-5" />
      default:
        return <Trophy className="w-5 h-5" />
    }
  }

  const getRankingTitle = () => {
    switch (rankingType) {
      case 'lucro':
        return 'Ranking por Lucro'
      case 'satisfacao':
        return 'Ranking por Satisfação'
      case 'bonus':
        return 'Ranking por Bônus'
      case 'matches':
        return 'Ranking por Participação'
      default:
        return 'Ranking dos Jogadores'
    }
  }

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Trophy className="w-5 h-5 text-orange-500" />
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">#{position}</span>
    }
  }

  const getRankColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200'
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
      case 3:
        return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200'
      default:
        return 'bg-white border-gray-200'
    }
  }

  const getFilterButtonClass = (type: RankingType) => {
    return `px-2 py-1.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
      rankingType === type
        ? 'bg-blue-600 text-white'
        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
    }`
  }

  const sortedPlayers = getSortedPlayers()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full prevent-overflow">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <span className="w-4 h-4 sm:w-5 sm:h-5">{getRankingIcon()}</span>
          <span className="truncate">{getRankingTitle()}</span>
        </h2>
        
        {/* Filtros */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            onClick={() => setRankingType('lucro')}
            className={getFilterButtonClass('lucro')}
          >
            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
            <span className="text-xs sm:text-sm">Lucro</span>
          </button>
          <button
            onClick={() => setRankingType('satisfacao')}
            className={getFilterButtonClass('satisfacao')}
          >
            <Target className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
            <span className="text-xs sm:text-sm">Satisfação</span>
          </button>
          <button
            onClick={() => setRankingType('bonus')}
            className={getFilterButtonClass('bonus')}
          >
            <Award className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
            <span className="text-xs sm:text-sm">Bônus</span>
          </button>
          <button
            onClick={() => setRankingType('matches')}
            className={getFilterButtonClass('matches')}
          >
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
            <span className="text-xs sm:text-sm">Participação</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {sortedPlayers.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum jogador ainda</h3>
            <p className="text-gray-600">Os jogadores aparecerão aqui após participarem do evento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPlayers.slice(0, 10).map((player, index) => {
              const position = index + 1
              
              return (
                <div 
                  key={player.player_id} 
                  className={`rounded-lg border p-3 sm:p-4 transition-all hover:shadow-md ${getRankColor(position)}`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    {/* Rank Icon */}
                    <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                      {getRankIcon(position)}
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <CustomTooltip content={player.player?.name || 'N/A'}>
                          <h3 className="font-semibold text-gray-800 truncate cursor-help">{player.player?.name || 'N/A'}</h3>
                        </CustomTooltip>
                        <CustomTooltip content={player.player?.email || 'N/A'}>
                          <p className="text-sm text-gray-600 truncate cursor-help">{player.player?.email || 'N/A'}</p>
                        </CustomTooltip>
                      </div>
                      
                      {/* Primary Metric */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                          {getPlayerValue(player)}
                        </div>
                        <div className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {player.total_matches} partidas
                        </div>
                      </div>
                      
                      {/* Secondary Metrics */}
                      {rankingType !== 'matches' && (
                        <div className="flex flex-col sm:flex-row sm:gap-4 mt-2 text-xs text-gray-600">
                          {rankingType !== 'lucro' && (
                            <span className="truncate">Lucro: {formatCurrency(player.total_profit)}</span>
                          )}
                          {rankingType !== 'satisfacao' && (
                            <span className="truncate">Satisfação: {player.avg_satisfaction}%</span>
                          )}
                          {rankingType !== 'bonus' && (
                            <span className="truncate">Bônus: {formatCurrency(player.avg_bonus)}</span>
                          )}
                        </div>
                      )}
                      
                      {/* Last Activity */}
                      <div className="text-xs text-gray-500 mt-1">
                        Última partida: {format(new Date(player.last_match), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {sortedPlayers.length > 10 && (
              <div className="text-center py-4 border-t border-gray-200 mt-4">
                <p className="text-sm text-gray-600">
                  Mostrando top 10 de {sortedPlayers.length} jogadores
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}