import { Users, Trophy, TrendingUp, Target, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { MatchResult } from '../../types'

interface Student {
  id: string
  name: string | null
  email: string | null
  joined_at: string | null
  total_matches: number
  avg_score: number
  color: number
  team_id: string | null
}

// Using global MatchResult type from types/index.ts

interface ClassStudentsListProps {
  students: Student[]
  matchResults?: MatchResult[]
  itemsPerPage?: number
}

export function ClassStudentsList({ students, matchResults = [], itemsPerPage = 10 }: ClassStudentsListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  
  const uniqueMatchNumbers = [...new Set(matchResults.map(r => r.match_number))]
  const totalUniqueMatches = uniqueMatchNumbers.length

  // Função para formatar valores em Real brasileiro
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const studentsWithResults = students.map(student => {
    const studentResults = matchResults.filter(result => result.player_id === student.id)
    
    const totalLucro = studentResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
    const totalSatisfacao = studentResults.reduce((sum, result) => sum + (result.satisfacao || 0), 0)
    const totalBonus = studentResults.reduce((sum, result) => sum + (result.bonus || 0), 0)
    const avgSatisfacao = studentResults.length > 0 ? totalSatisfacao / studentResults.length : 0
    const totalScore = totalLucro + totalSatisfacao + totalBonus

    const individualEngagement = totalUniqueMatches > 0 
      ? Math.min(100, Math.round((studentResults.length / totalUniqueMatches) * 100))
      : 0

    return {
      ...student,
      totalLucro,
      avgSatisfacao: Math.round(avgSatisfacao),
      totalBonus,
      totalScore: Math.round(totalScore),
      matchesPlayed: studentResults.length,
      engagement: individualEngagement
    }
  })

  // Cálculos para paginação
  const totalItems = studentsWithResults.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentStudents = studentsWithResults.slice(startIndex, endIndex)

  // Funções de navegação
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 80) return 'text-green-600'
    if (engagement >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getEngagementBgColor = (engagement: number) => {
    if (engagement >= 80) return 'bg-green-50'
    if (engagement >= 60) return 'bg-yellow-50'
    return 'bg-red-50'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Alunos e Resultados Detalhados ({totalItems})
        </h2>
        
        {totalPages > 1 && (
          <div className="text-sm text-gray-500">
            Página {currentPage} de {totalPages}
          </div>
        )}
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Aluno</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">E-mail</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Partidas</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Lucro</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Satisfação</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Bônus</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Engajamento</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Ingressou em</th>
            </tr>
          </thead>
          <tbody>
            {currentStudents.map((student) => (
              <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-gray-800 truncate max-w-[150px]" title={student.name || ''}>{student.name}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">
                  <span className="truncate max-w-[180px] block" title={student.email || ''}>{student.email}</span>
                </td>
                <td className="py-3 px-4 text-gray-600">
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {student.matchesPlayed}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className={`font-medium ${getScoreColor(student.totalLucro)} truncate`}>
                      {formatCurrency(student.totalLucro)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className={`font-medium ${getScoreColor(student.avgSatisfacao)}`}>
                      {student.avgSatisfacao}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                    <span className={`font-medium ${getScoreColor(student.totalBonus)} truncate`}>
                      {formatCurrency(student.totalBonus)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${getEngagementBgColor(student.engagement)} ${getEngagementColor(student.engagement)} whitespace-nowrap`}>
                    {student.engagement}%
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                  {student.joined_at && format(new Date(student.joined_at), 'dd/MM/yyyy', { locale: ptBR })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {currentStudents.map((student) => (
          <div key={student.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-800 truncate" title={student.name || ''}>
                  {student.name}
                </h3>
                <p className="text-sm text-gray-600 truncate" title={student.email || ''}>
                  {student.email}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEngagementBgColor(student.engagement)} ${getEngagementColor(student.engagement)} whitespace-nowrap ml-2`}>
                {student.engagement}%
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600">{student.matchesPlayed} partidas</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className={`font-medium ${getScoreColor(student.totalLucro)} truncate`} title={formatCurrency(student.totalLucro)}>
                  {formatCurrency(student.totalLucro)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className={`font-medium ${getScoreColor(student.avgSatisfacao)}`}>
                  {student.avgSatisfacao}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <span className={`font-medium ${getScoreColor(student.totalBonus)} truncate`} title={formatCurrency(student.totalBonus)}>
                  {formatCurrency(student.totalBonus)}
                </span>
              </div>
            </div>
            
            {student.joined_at && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  Ingressou em: {format(new Date(student.joined_at), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controles de Paginação */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200 gap-4">
          <div className="text-sm text-gray-600 order-2 sm:order-1">
            Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} alunos
          </div>
          
          <div className="flex items-center gap-1 order-1 sm:order-2 overflow-x-auto">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] flex-shrink-0 ${
                currentPage === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Mostrar apenas algumas páginas ao redor da página atual
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] min-w-[44px] flex-shrink-0 ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className="px-2 py-2 text-gray-400 flex-shrink-0">
                      ...
                    </span>
                  )
                }
                return null
              })}
            </div>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] flex-shrink-0 ${
                currentPage === totalPages
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {matchResults.length === 0 && (
        <div className="text-center py-8 border-t border-gray-200 mt-4">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum resultado de partida registrado ainda.</p>
          <p className="text-gray-500 text-sm mt-2">
            Os resultados aparecerão aqui quando as partidas forem jogadas.
          </p>
        </div>
      )}
    </div>
  )
}