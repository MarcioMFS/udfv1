import { Trophy, Medal, Crown, User, TrendingUp, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CustomTooltip } from '../ui/CustomTooltip'

interface EventPlayer {
  id: string
  name: string
  email: string
  total_matches: number
  avg_lucro: number
  avg_satisfaction: number
  avg_bonus: number
  total_profit: number
  last_match: string
  class_code: string
  class_description: string
}

interface EventPlayerRankingProps {
  players: EventPlayer[]
}

export function EventPlayerRanking({ players }: EventPlayerRankingProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Ranking dos Jogadores
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Classificação por lucro total acumulado
        </p>
      </div>

      <div className="p-6">
        {players.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum jogador ainda</h3>
            <p className="text-gray-600">Os jogadores aparecerão aqui após participarem do evento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {players.slice(0, 10).map((player, index) => {
              const position = index + 1
              
              return (
                <div 
                  key={player.id} 
                  className={`rounded-lg border p-4 transition-all hover:shadow-md ${getRankColor(position)}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Rank Icon */}
                    <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
                      {getRankIcon(position)}
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <CustomTooltip content={player.name}>
                          <h3 className="font-semibold text-gray-800 truncate cursor-help">{player.name}</h3>
                        </CustomTooltip>
                        <CustomTooltip content={player.email}>
                          <p className="text-sm text-gray-600 truncate cursor-help">{player.email}</p>
                        </CustomTooltip>
                        <CustomTooltip content={`Turma: ${player.class_code} - ${player.class_description || 'Sem descrição'}`}>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1 cursor-help">
                            {player.class_code}
                          </span>
                        </CustomTooltip>
                      </div>
                    </div>

                    {/* Stats Column */}
                    <div className="text-right flex-shrink-0 min-w-[120px]">
                      <CustomTooltip content={`Lucro total: ${formatCurrency(player.total_profit)}`}>
                        <div className="text-base font-bold text-gray-800 break-words cursor-help">
                          {formatCurrency(player.total_profit)}
                        </div>
                      </CustomTooltip>
                      <CustomTooltip content={`Total de ${player.total_matches} partidas jogadas`}>
                        <div className="text-sm text-gray-600 whitespace-nowrap cursor-help">
                          {player.total_matches} partidas
                        </div>
                      </CustomTooltip>
                      <CustomTooltip content={`Última partida: ${format(new Date(player.last_match), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`}>
                        <div className="text-xs text-gray-500 whitespace-nowrap cursor-help">
                          {format(new Date(player.last_match), 'dd/MM/yy', { locale: ptBR })}
                        </div>
                      </CustomTooltip>
                    </div>
                  </div>

                  {/* Stats Footer */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <CustomTooltip content={`Satisfação média: ${player.avg_satisfaction}%`}>
                        <div className="flex items-center gap-1 text-gray-600 cursor-help">
                          <TrendingUp className="w-3 h-3" />
                          {player.avg_satisfaction}% satisfação
                        </div>
                      </CustomTooltip>
                      <CustomTooltip content={`Lucro médio por partida: ${formatCurrency(player.avg_lucro)}`}>
                        <div className="flex items-center gap-1 text-gray-600 cursor-help">
                          <DollarSign className="w-3 h-3" />
                          Média: {formatCurrency(player.avg_lucro)}
                        </div>
                      </CustomTooltip>
                    </div>
                  </div>
                </div>
              )
            })}

            {players.length > 10 && (
              <div className="text-center py-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  E mais {players.length - 10} jogadores...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}