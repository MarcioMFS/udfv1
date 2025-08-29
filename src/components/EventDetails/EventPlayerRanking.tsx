// src/components/EventDetails/EventPlayerRanking.tsx
import { Trophy, Medal, Crown, User, TrendingUp, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10">
                        {getRankIcon(position)}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{player.name}</h3>
                        <p className="text-sm text-gray-600">{player.email}</p>
                        
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(player.total_profit)}
                          </div>
                          
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <TrendingUp className="w-3 h-3" />
                            {player.avg_satisfaction}% satisfação
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">
                        R$ {player.avg_lucro}
                      </div>
                      <div className="text-sm text-gray-600">
                        {player.total_matches} partidas
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Última: {format(new Date(player.last_match), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar for satisfaction */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                      <span>Satisfação</span>
                      <span>{player.avg_satisfaction}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(player.avg_satisfaction, 100)}%` }}
                      ></div>
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