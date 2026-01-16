import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Crown, ChevronLeft, ChevronRight, Users, UserCheck, TrendingUp, Target, Info } from 'lucide-react'

interface RankingData {
  name: string
  score: number
  position: number
  matches: number
  isTeam?: boolean
  purpose?: 'lucro' | 'satisfacao' | 'bonus' | null
  statusColor?: 'green' | 'yellow' | 'red' | 'gray'
}

interface ClassRankingChartProps {
  rankingData: RankingData[]
  getRankIcon: (position: number) => JSX.Element
  classId: string
}

export function ClassRankingChart({ 
  rankingData, 
  getRankIcon, 
  classId,
}: ClassRankingChartProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'players' | 'teams'>('players')
  const [playersCurrentPage, setPlayersCurrentPage] = useState(1)
  const [teamsCurrentPage, setTeamsCurrentPage] = useState(1)
  const itemsPerPage = 10

  const getPurposeIcon = (purpose: 'lucro' | 'satisfacao' | 'bonus' | null) => {
    if (!purpose) return null
    
    const purposeLabel = getPurposeLabel(purpose)
    if (!purposeLabel) return null
    
    return (
      <div className="relative group">
        {purpose === 'lucro' && <TrendingUp className="w-4 h-4 text-blue-600 cursor-help" />}
        {purpose === 'satisfacao' && <Target className="w-4 h-4 text-green-600 cursor-help" />}
        {purpose === 'bonus' && <Trophy className="w-4 h-4 text-yellow-600 cursor-help" />}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
          {purposeLabel}
        </div>
      </div>
    )
  }

  const handleNameClick = (name: string) => {
    navigate(`/classes/${classId}?tab=indicators&search=${encodeURIComponent(name)}`)
  }

  const getStatusColor = (color: 'green' | 'yellow' | 'red' | 'gray' | undefined) => {
    if (!color) return 'bg-gray-400'
    
    switch (color) {
      case 'green': return 'bg-green-500'
      case 'yellow': return 'bg-yellow-500'
      case 'red': return 'bg-red-500'
      case 'gray': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusLabel = (color: 'green' | 'yellow' | 'red' | 'gray' | undefined) => {
    if (!color) return 'Indefinido'
    
    switch (color) {
      case 'green': return 'Excelente'
      case 'yellow': return 'Bom'
      case 'red': return 'Precisa melhorar'
      case 'gray': return 'Não jogou'
      default: return 'Indefinido'
    }
  }

  const getPurposeLabel = (purpose: 'lucro' | 'satisfacao' | 'bonus' | null) => {
    if (!purpose) return null
    
    switch (purpose) {
      case 'lucro': return 'Lucro'
      case 'satisfacao': return 'Satisfação'
      case 'bonus': return 'Bônus'
      default: return null
    }
  }

  // Separar dados por tipo
  const playersData = rankingData.filter(item => !item.isTeam)
  const teamsData = rankingData.filter(item => item.isTeam)

  // Determinar dados ativos baseado na aba
  const activeData = activeTab === 'players' ? playersData : teamsData
  const currentPage = activeTab === 'players' ? playersCurrentPage : teamsCurrentPage
  const setCurrentPage = activeTab === 'players' ? setPlayersCurrentPage : setTeamsCurrentPage

  // Calcular paginação
  const totalPages = Math.ceil(activeData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = activeData.slice(startIndex, endIndex)

  // Recalcular posições para os dados paginados
  const paginatedWithCorrectPositions = paginatedData.map((item, index) => ({
    ...item,
    position: startIndex + index + 1
  }))

  const topPlayer = activeData.length > 0 ? activeData[0] : null

  return (
    <div className="space-y-6">

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Ranking Completo
          <div className="relative group">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
          </div>
        </h2>

        {/* Legenda dos Indicadores de Status */}
        <div className="mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">📊 Legenda dos Indicadores de Status:</h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="text-gray-700">
                <strong>Verde:</strong> Excelente (≥80%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full flex-shrink-0"></div>
              <span className="text-gray-700">
                <strong>Amarelo:</strong> Bom (50-79%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
              <span className="text-gray-700">
                <strong>Vermelho:</strong> Precisa melhorar (&lt;50%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full flex-shrink-0"></div>
              <span className="text-gray-700">
                <strong>Cinza:</strong> Não jogou
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            <em>* Cálculo baseado em 70% performance no propósito + 30% engajamento (frequência)</em>
          </p>
        </div>

        {/* Abas para alternar entre jogadores e times */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => {
              setActiveTab('players')
              setPlayersCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto flex-shrink-0 ${
              activeTab === 'players'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Jogadores ({playersData.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('teams')
              setTeamsCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto flex-shrink-0 ${
              activeTab === 'teams'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Times ({teamsData.length})
          </button>
        </div>

        {topPlayer && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex items-center gap-4">
            <Crown className="w-10 h-10 text-yellow-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 font-medium">
                🏆 {activeTab === 'players' ? 'Melhor Jogador' : 'Melhor Time'}
              </p>
              <h3 className="text-2xl font-bold text-blue-800">{topPlayer.name}</h3>
              <p className="text-blue-700">
                <span className="font-semibold">{topPlayer.score}</span> pontos totais em{' '}
                <span className="font-semibold">{topPlayer.matches}</span> partidas
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Menor soma de posições = melhor classificação geral
              </p>
            </div>
          </div>
        )}

        {/* Ranking Table */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Classificação Detalhada</h3>
          
          {activeData.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-semibold">
                Nenhum {activeTab === 'players' ? 'jogador' : 'time'} encontrado
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {activeTab === 'players' 
                  ? 'Os jogadores aparecerão aqui quando houver resultados de partidas.' 
                  : 'Os times aparecerão aqui quando forem criados e tiverem resultados.'}
              </p>
            </div>
          ) : (
            <>
              {paginatedWithCorrectPositions.map((student) => (
                <div key={student.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getRankIcon(student.position)}
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleNameClick(student.name)}
                          className="font-medium text-gray-800 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {student.position}º {student.name}
                        </button>
                        {getPurposeIcon(student.purpose || null)}
                        {student.statusColor && (
                          <div className="relative group">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 cursor-help ${getStatusColor(student.statusColor)}`}></div>
                            <div className="absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                              {getStatusLabel(student.statusColor)}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{student.matches} partidas jogadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-800">{student.score}</span>
                    <p className="text-sm text-gray-600">pontos totais</p>
                    <p className="text-xs text-gray-500">soma das posições</p>
                  </div>
                </div>
              ))}

              {/* Controles de paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, activeData.length)} de {activeData.length} {activeTab === 'players' ? 'jogadores' : 'times'}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Mostrar apenas algumas páginas ao redor da página atual
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 2 && page <= currentPage + 2)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                page === currentPage
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        } else if (
                          page === currentPage - 3 ||
                          page === currentPage + 3
                        ) {
                          return (
                            <span key={page} className="px-2 py-2 text-gray-400">
                              ...
                            </span>
                          )
                        }
                        return null
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Legenda */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">Como funciona o ranking:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>1. Cada {activeTab === 'players' ? 'jogador' : 'time'} recebe uma posição em cada indicador (Lucro, Satisfação, Bônus)</p>
            <p>2. As três posições são somadas para formar a pontuação total</p>
            <p>3. Menor pontuação total = melhor classificação geral</p>
            <p>4. Em caso de empate, desempata-se por: maior lucro → maior satisfação → maior bônus</p>
          </div>
        </div>
      </div>
    </div>
  )
}