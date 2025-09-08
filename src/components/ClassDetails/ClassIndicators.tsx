import { useState, useEffect } from 'react'
import { Users, TrendingUp, Trophy, Target, User, Search, Award } from 'lucide-react'

interface StudentIndicator {
  id: string
  name: string | null
  email: string | null
  totalLucro: number
  avgSatisfacao: number
  totalBonus: number
  purpose: 'lucro' | 'satisfacao' | 'bonus' | null
  groupPurpose: 'lucro' | 'satisfacao' | 'bonus' | null
  statusColor: 'green' | 'yellow' | 'red' | 'gray'
  lucroPosition: number
  satisfacaoPosition: number
  bonusPosition: number
  totalPosition: number
  hasParticipated: boolean
  individualEngagement: number
}

interface ClassIndicatorsProps {
  studentIndicators: StudentIndicator[]
  isLoading: boolean
  initialSearchTerm?: string
}

export function ClassIndicators({ studentIndicators, isLoading, initialSearchTerm = '' }: ClassIndicatorsProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [purposeFilter, setPurposeFilter] = useState<'lucro' | 'satisfacao' | 'bonus' | 'todos'>('todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm)
    }
  }, [initialSearchTerm])

  // Função para formatar valores monetários em Real brasileiro
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Função para determinar o propósito efetivo do estudante (individual ou do time)
  const getEffectivePurpose = (student: StudentIndicator): 'lucro' | 'satisfacao' | 'bonus' | null => {
    // Retorna o propósito individual ou do time
    return student.purpose || student.groupPurpose
  }

  const getFilteredAndSortedStudents = () => {
    let filtered = studentIndicators.filter(student => {
      const matchesSearchTerm = searchTerm === '' ||
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())

      const effectivePurpose = getEffectivePurpose(student)
      const matchesPurpose = purposeFilter === 'todos' || effectivePurpose === purposeFilter

      return matchesSearchTerm && matchesPurpose
    })

    switch (purposeFilter) {
      case 'lucro':
        return filtered.sort((a, b) => b.totalLucro - a.totalLucro)
      case 'satisfacao':
        return filtered.sort((a, b) => b.avgSatisfacao - a.avgSatisfacao)
      case 'bonus':
        return filtered.sort((a, b) => b.totalBonus - a.totalBonus)
      case 'todos':
      default:
        return filtered.sort((a, b) => a.totalPosition - b.totalPosition)
    }
  }

  const filteredIndicators = getFilteredAndSortedStudents()

  // Paginação
  const totalPages = Math.ceil(filteredIndicators.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedIndicators = filteredIndicators.slice(startIndex, endIndex)

  // Reset página quando filtros mudam
  const handleFilterChange = (filter: 'lucro' | 'satisfacao' | 'bonus' | 'todos') => {
    setPurposeFilter(filter)
    setCurrentPage(1)
  }

  const handleSearchChange = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const renderPaginationButtons = () => {
    const buttons = []
    const maxVisibleButtons = 5
    
    if (totalPages <= maxVisibleButtons) {
      // Mostrar todos os botões se tiver poucos
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentPage === i
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {i}
          </button>
        )
      }
    } else {
      // Lógica para muitas páginas
      const startPage = Math.max(1, currentPage - 2)
      const endPage = Math.min(totalPages, currentPage + 2)

      if (startPage > 1) {
        buttons.push(
          <button
            key={1}
            onClick={() => handlePageChange(1)}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
          >
            1
          </button>
        )
        if (startPage > 2) {
          buttons.push(<span key="dots1" className="px-2 text-gray-500">...</span>)
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        buttons.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentPage === i
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {i}
          </button>
        )
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          buttons.push(<span key="dots2" className="px-2 text-gray-500">...</span>)
        }
        buttons.push(
          <button
            key={totalPages}
            onClick={() => handlePageChange(totalPages)}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
          >
            {totalPages}
          </button>
        )
      }
    }

    return buttons
  }

  const getPrimaryValue = (student: StudentIndicator) => {
    switch (purposeFilter) {
      case 'lucro':
        return formatCurrency(student.totalLucro)
      case 'satisfacao':
        return `${student.avgSatisfacao}%`
      case 'bonus':
        return formatCurrency(student.totalBonus)
      case 'todos':
      default:
        return null // Não mostrar pontuação para "todos"
    }
  }

  const getPrimaryIcon = () => {
    switch (purposeFilter) {
      case 'lucro':
        return <TrendingUp className="w-4 h-4 text-blue-600" />
      case 'satisfacao':
        return <Target className="w-4 h-4 text-green-600" />
      case 'bonus':
        return <Trophy className="w-4 h-4 text-yellow-600" />
      case 'todos':
      default:
        return <Award className="w-4 h-4 text-purple-600" />
    }
  }

  const getRankingTitle = () => {
    switch (purposeFilter) {
      case 'lucro':
        return 'Ranking de Lucro'
      case 'satisfacao':
        return 'Ranking de Satisfação'
      case 'bonus':
        return 'Ranking de Bônus'
      case 'todos':
      default:
        return 'Ranking Geral'
    }
  }

  const getPurposeLabel = (purpose: 'lucro' | 'satisfacao' | 'bonus' | null) => {
    switch (purpose) {
      case 'lucro': return 'Lucro'
      case 'satisfacao': return 'Satisfação'
      case 'bonus': return 'Bônus'
      default: return 'Não definido'
    }
  }

  const getPurposeColor = (purpose: 'lucro' | 'satisfacao' | 'bonus' | null) => {
    switch (purpose) {
      case 'lucro': return 'bg-blue-100 text-blue-800'
      case 'satisfacao': return 'bg-green-100 text-green-800'
      case 'bonus': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (color: 'green' | 'yellow' | 'red' | 'gray') => {
    switch (color) {
      case 'green': return 'bg-green-500'
      case 'yellow': return 'bg-yellow-500'
      case 'red': return 'bg-red-500'
      case 'gray': return 'bg-gray-400'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (color: 'green' | 'yellow' | 'red' | 'gray') => {
    switch (color) {
      case 'green': return 'Excelente (performance + engajamento)'
      case 'yellow': return 'Bom (performance ou engajamento mediano)'
      case 'red': return 'Precisa melhorar'
      case 'gray': return 'Não jogou'
      default: return 'Indefinido'
    }
  }


  
  if (isLoading) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-center h-32">
                <div className="text-center">
                    <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">Carregando indicadores...</p>
                </div>
            </div>
        </div>
    )
  }

  if (studentIndicators.length === 0) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Indicadores por Aluno
            </h2>
            <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum indicador disponível ainda.</p>
                <p className="text-gray-500 text-sm mt-2">
                    Os indicadores aparecerão quando houver resultados de partidas.
                </p>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
          {getPrimaryIcon()}
          {getRankingTitle()}
        </h2>

        {/* --- INÍCIO DA SEÇÃO DE FILTROS --- */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtro por Nome/Email */}
                <div className="md:col-span-1">
                    <label htmlFor="search-indicator" className="block text-sm font-medium text-gray-700 mb-1">
                        Buscar por nome ou email
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            id="search-indicator"
                            type="text"
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Digite para buscar..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                </div>

                {/* Filtro por Propósito */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Filtrar por propósito
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => handleFilterChange('todos')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${purposeFilter === 'todos' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}>Todos</button>
                        <button onClick={() => handleFilterChange('lucro')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${purposeFilter === 'lucro' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}>Lucro</button>
                        <button onClick={() => handleFilterChange('satisfacao')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${purposeFilter === 'satisfacao' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}>Satisfação</button>
                        <button onClick={() => handleFilterChange('bonus')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${purposeFilter === 'bonus' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}>Bônus</button>
                    </div>
                </div>
            </div>
        </div>
        {/* --- FIM DA SEÇÃO DE FILTROS --- */}

        {/* --- LEGENDA DOS INDICADORES DE STATUS --- */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">📊 Legenda dos Indicadores de Status:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
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
        {/* --- FIM DA LEGENDA --- */}

        {/* --- Renderização dos cards no formato de ranking --- */}
        <div className="space-y-3">
          {paginatedIndicators.map((student) => {
            
            return (
              <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  
                  {/* Informações do estudante */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800 truncate">{student.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPurposeColor(getEffectivePurpose(student))}`}>
                          {getPurposeLabel(getEffectivePurpose(student))}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate" title={student.email || ''}>{student.email}</p>
                    </div>
                  </div>
                  
                  {/* Valor principal baseado no filtro */}
                  {getPrimaryValue(student) && (
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        {getPrimaryIcon()}
                        <span className="text-lg font-bold text-gray-800">{getPrimaryValue(student)}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Indicador de status */}
                  <div className="relative group">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 cursor-help ${getStatusColor(student.statusColor)}`}></div>
                    <div className="absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                      {getStatusLabel(student.statusColor)}
                    </div>
                  </div>
                </div>
                
                {/* Detalhes expandidos - apenas para "todos" */}
                {purposeFilter === 'todos' && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-gray-600">Lucro</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{formatCurrency(student.totalLucro)}</span>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Target className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-gray-600">Satisfação</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{student.avgSatisfacao}%</span>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Trophy className="w-3 h-3 text-yellow-600" />
                          <span className="text-xs text-gray-600">Bônus</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{formatCurrency(student.totalBonus)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Informações da paginação e controles */}
        {filteredIndicators.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredIndicators.length)} de {filteredIndicators.length} estudantes
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                
                <div className="flex items-center gap-1">
                  {renderPaginationButtons()}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        )}
        
        {filteredIndicators.length === 0 && (
            <div className="text-center py-10">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-semibold">Nenhum aluno encontrado</p>
                <p className="text-gray-500 text-sm mt-2">
                    {purposeFilter !== 'todos' 
                        ? `Nenhum estudante com propósito "${getPurposeLabel(purposeFilter)}" encontrado.`
                        : 'Tente ajustar seus filtros ou limpar a busca.'
                    }
                </p>
                <button 
                    onClick={() => { handleSearchChange(''); handleFilterChange('todos'); }} 
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                    Limpar Filtros
                </button>
            </div>
        )}
      </div>
    </div>
  )
}