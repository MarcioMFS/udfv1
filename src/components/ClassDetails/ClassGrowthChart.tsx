//ClassGrowthChart
import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Target, Trophy, LayoutGrid, Users, Search, Filter, X } from 'lucide-react'
import { MatchResult } from '../../types'


type Indicator = 'lucro' | 'satisfacao' | 'bonus' | 'geral'

interface GrowthData {
  match_number: number
  [key: string]: number
}

interface Student {
  id: string
  name: string | null
  email: string | null
  joined_at: string | null
  total_matches: number
  avg_score: number
  purpose: 'lucro' | 'satisfacao' | 'bonus' | null
  team_id: string | null
}

// Using global MatchResult type from types/index.ts

interface Team {
  id: string
  name: string | null
  group_purpose: 'lucro' | 'satisfacao' | 'bonus' | null
  class_id: string
  members: Student[]
}

interface StudentGrowthProps {
  students: Student[]
  matchResults: MatchResult[]
  teams?: Team[]
}
export default function StudentGrowth({ students, matchResults, teams = [] }: StudentGrowthProps) {
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator>('geral')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [growthData, setGrowthData] = useState<GrowthData[]>([])
  const [classAverages, setClassAverages] = useState<GrowthData[]>([])
  const [unifiedData, setUnifiedData] = useState<GrowthData[]>([])
  
  // Novos estados para filtros
  const [studentFilter, setStudentFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [minMatches, setMinMatches] = useState(0)
  const [sortBy, setSortBy] = useState<'name' | 'matches' | 'performance'>('name')

  // Função para determinar o propósito efetivo do estudante (individual ou do time)
  const getEffectivePurpose = (student: Student): 'lucro' | 'satisfacao' | 'bonus' | null => {
    if (student.purpose) return student.purpose
    
    const studentTeam = teams.find(team => 
      team.members.some(member => member.id === student.id)
    )
    
    return studentTeam?.group_purpose || null
  }

  // Filtra alunos baseado no indicador selecionado
  const filteredStudents = useMemo(() => {
    if (selectedIndicator === 'geral') return students
    
    return students.filter(student => {
      // Primeiro verifica se o aluno tem o propósito correspondente ao indicador
      const effectivePurpose = getEffectivePurpose(student)
      if (effectivePurpose !== selectedIndicator) return false
      
      // Depois verifica se tem resultados para o indicador específico (opcional)
      const studentResults = matchResults.filter(result => result.player_id === student.id)
      if (studentResults.length === 0) return true // Inclui alunos sem resultados se tiverem o propósito correto
      
      // Verifica se o aluno tem resultados para o indicador específico
      switch (selectedIndicator) {
        case 'lucro':
          return studentResults.some(result => (result.lucro || 0) >= 0)
        case 'satisfacao':
          return studentResults.some(result => (result.satisfacao || 0) >= 0)
        case 'bonus':
          return studentResults.some(result => (result.bonus_money || 0) >= 0)
        default:
          return true
      }
    })
  }, [students, matchResults, selectedIndicator, teams])

  // Função para calcular estatísticas do aluno
  const getStudentStats = (studentId: string) => {
    const studentResults = matchResults.filter(result => result.player_id === studentId)
    const matchCount = studentResults.length
    const totalLucro = studentResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
    const avgSatisfacao = studentResults.length > 0
      ? studentResults.reduce((sum, result) => sum + (result.satisfacao || 0), 0) / studentResults.length
      : 0
    const totalBonus = studentResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)
    
    return {
      matchCount,
      totalLucro,
      avgSatisfacao,
      totalBonus,
      overallPerformance: totalLucro + avgSatisfacao + totalBonus
    }
  }

  // Função de filtro melhorada
  const getFilteredAndSortedStudents = useMemo(() => {
    let filtered = selectedIndicator === 'geral' ? students : filteredStudents

    // Filtro por nome
    if (studentFilter.trim()) {
      filtered = filtered.filter(student => 
        (student.name ?? '').toLowerCase().includes(studentFilter.toLowerCase())
      )
    }

    // Filtro por número mínimo de partidas
    if (minMatches > 0) {
      filtered = filtered.filter(student => {
        const stats = getStudentStats(student.id)
        return stats.matchCount >= minMatches
      })
    }

    // Ordenação
    filtered = [...filtered].sort((a, b) => {
      const statsA = getStudentStats(a.id)
      const statsB = getStudentStats(b.id)
      
      switch (sortBy) {
        case 'name':
          return (a.name ?? '').localeCompare(b.name ?? '')
        case 'matches':
          return statsB.matchCount - statsA.matchCount
        case 'performance':
          return statsB.overallPerformance - statsA.overallPerformance
        default:
          return 0
      }
    })

    return filtered
  }, [students, filteredStudents, selectedIndicator, studentFilter, minMatches, sortBy, matchResults])

  useEffect(() => {
    calculateGrowthData()
  }, [selectedIndicator, selectedStudents, matchResults])

  const isMonetaryIndicator = (indicator: string | Indicator) => {
    return typeof indicator === 'string' ? 
      indicator.toLowerCase().includes('lucro') || indicator.toLowerCase().includes('bônus') || indicator.toLowerCase().includes('bonus') :
      indicator === 'lucro' || indicator === 'bonus'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(value)
  }

  const calculateDataForIndicator = (indicator: 'lucro' | 'satisfacao' | 'bonus') => {
    const matchNumbers = [...new Set(matchResults.map(result => result.match_number))].sort((a, b) => a - b)
    
    const growthByMatch: GrowthData[] = matchNumbers.map(matchNumber => {
      const matchData: GrowthData = { match_number: matchNumber }
      
      selectedStudents.forEach(studentId => {
        const student = students.find(s => s.id === studentId)
        if (!student) return
        
        const studentResults = matchResults
          .filter(result => result.player_id === studentId && result.match_number <= matchNumber)
          .sort((a, b) => a.match_number - b.match_number)
        
        if (studentResults.length > 0) {
          const studentName = student.name || `Aluno ${studentId.slice(0, 8)}`
          let value = 0
          
          switch (indicator) {
            case 'lucro':
              value = studentResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
              break
            case 'satisfacao':
              value = studentResults[studentResults.length - 1].satisfacao || 0
              break
            case 'bonus':
              value = studentResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)
              break
          }
          
          matchData[`${studentName} - ${getIndicatorLabel(indicator)}`] = Math.round(value)
        }
      })
      
      return matchData
    })
    
    const averagesByMatch: GrowthData[] = matchNumbers.map(matchNumber => {
      const matchData: GrowthData = { match_number: matchNumber }
      const relevantStudents = selectedIndicator === 'geral' ? students : filteredStudents;
      
      const allStudentResults = relevantStudents.map(student => {
        const studentResults = matchResults.filter(result => result.player_id === student.id && result.match_number <= matchNumber)
        if (studentResults.length === 0) return 0
        switch (indicator) {
          case 'lucro': return studentResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
          case 'satisfacao': return studentResults.sort((a,b) => b.match_number - a.match_number)[0]?.satisfacao || 0
          case 'bonus': return studentResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)
          default: return 0
        }
      }).filter(value => value > 0)
      
      if (allStudentResults.length > 0) {
        matchData[`Média da Turma - ${getIndicatorLabel(indicator)}`] = Math.round(allStudentResults.reduce((sum, value) => sum + value, 0) / allStudentResults.length)
      }
      return matchData
    })

    return { growth: growthByMatch, avg: averagesByMatch }
  }

  const calculateUnifiedData = () => {
    const matchNumbers = [...new Set(matchResults.map(result => result.match_number))].sort((a, b) => a - b)
    
    const unified: GrowthData[] = matchNumbers.map(matchNumber => {
      const matchData: GrowthData = { match_number: matchNumber }
      
      selectedStudents.forEach(studentId => {
        const student = students.find(s => s.id === studentId)
        if (!student) return
        
        const studentResults = matchResults
          .filter(result => result.player_id === studentId && result.match_number <= matchNumber)
          .sort((a, b) => a.match_number - b.match_number)
        
        if (studentResults.length > 0) {
          const studentName = student.name || `Aluno ${studentId.slice(0, 8)}`
          
          const lucroValue = studentResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
          matchData[`${studentName} - Lucro`] = Math.round(lucroValue)

          const satisfacaoValue = studentResults[studentResults.length - 1].satisfacao || 0
          matchData[`${studentName} - Satisfação`] = Math.round(satisfacaoValue)

          const bonusValue = studentResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)
          matchData[`${studentName} - Bônus`] = Math.round(bonusValue)
        }
      })
      
      const indicators = ['lucro', 'satisfacao', 'bonus'] as const
      indicators.forEach(indicator => {
        const allStudentResults = students.map(student => {
          const studentResults = matchResults.filter(result => result.player_id === student.id && result.match_number <= matchNumber)
          if (studentResults.length === 0) return 0
          switch (indicator) {
            case 'lucro': return studentResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
            case 'satisfacao': return studentResults.sort((a,b) => b.match_number - a.match_number)[0]?.satisfacao || 0
            case 'bonus': return studentResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)
            default: return 0
          }
        }).filter(value => value > 0)
        
        if (allStudentResults.length > 0) {
          matchData[`Média da Turma - ${getIndicatorLabel(indicator)}`] = Math.round(allStudentResults.reduce((sum, value) => sum + value, 0) / allStudentResults.length)
        }
      })
      
      return matchData
    })
    
    return unified
  }
  
  const calculateGrowthData = () => {
    if (selectedIndicator === 'geral') {
      const unified = calculateUnifiedData()
      setUnifiedData(unified)
      setGrowthData([])
      setClassAverages([])
    } else {
      const { growth, avg } = calculateDataForIndicator(selectedIndicator)
      setGrowthData(growth)
      setClassAverages(avg)
      setUnifiedData([])
    }
  }

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId])
  }
  
  const getIndicatorLabel = (indicator: Indicator) => {
    switch (indicator) {
      case 'lucro': return 'Lucro'
      case 'satisfacao': return 'Satisfação'
      case 'bonus': return 'Bônus'
      case 'geral': return 'Visão Geral'
      default: return ''
    }
  }

  const getIndicatorIcon = (indicator: Indicator) => {
    switch (indicator) {
      case 'lucro': return <TrendingUp className="w-4 h-4" />
      case 'satisfacao': return <Target className="w-4 h-4" />
      case 'bonus': return <Trophy className="w-4 h-4" />
      case 'geral': return <LayoutGrid className="w-4 h-4" />
      default: return null
    }
  }

  // Tooltip customizado para formatar valores monetários
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs z-50">
          <p className="font-medium text-gray-800 truncate">{`Partida ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm truncate" style={{ color: entry.color }} title={`${entry.name}: ${isMonetaryIndicator(entry.name) ? formatCurrency(entry.value) : entry.value}`}>
              {`${entry.name}: ${isMonetaryIndicator(entry.name) ? formatCurrency(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16']

  const getLineColor = (dataKey: string, index: number) => {
    if (dataKey.includes('Média da Turma')) {
      if (dataKey.includes('Lucro')) return '#3B82F6'
      if (dataKey.includes('Satisfação')) return '#10B981'
      if (dataKey.includes('Bônus')) return '#F59E0B'
      return '#6B7280'
    }
    return colors[index % colors.length]
  }

  const renderChart = (data: GrowthData[], avgData: GrowthData[], indicator: 'lucro' | 'satisfacao' | 'bonus') => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        {getIndicatorIcon(indicator)}
        Evolução de {getIndicatorLabel(indicator)}
      </h3>
      <div className="h-64 sm:h-80 lg:h-96 w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="match_number" 
              label={{ value: 'Partida', position: 'insideBottom', offset: -5 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: `${getIndicatorLabel(indicator)}`, angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => isMonetaryIndicator(indicator) ? formatCurrency(value) : value}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {selectedStudents.map((studentId, index) => {
              const student = students.find(s => s.id === studentId)
              if (!student) return null
              return <Line key={studentId} type="monotone" dataKey={`${student.name || `Aluno ${studentId.slice(0, 8)}`} - ${getIndicatorLabel(indicator)}`} stroke={colors[index % colors.length]} strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
            })}
            <Line type="monotone" dataKey={`Média da Turma - ${getIndicatorLabel(indicator)}`} data={avgData} stroke="#6B7280" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  const renderUnifiedChart = (data: GrowthData[]) => {
    const dataKeys = Object.keys(data[0] || {}).filter(key => key !== 'match_number')
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" />
          Evolução Geral - Todos os Indicadores
        </h3>
        <div className="h-64 sm:h-80 lg:h-96 w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="match_number" 
                label={{ value: 'Partida', position: 'insideBottom', offset: -5 }}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'Valores', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => {
                  // Para o gráfico unificado, formatamos apenas valores altos como monetários
                  // assumindo que valores > 100 são monetários
                  return value > 100 ? formatCurrency(value) : value
                }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {dataKeys.map((dataKey, index) => {
                const isAverage = dataKey.includes('Média da Turma')
                return (
                  <Line
                    key={dataKey}
                    type="monotone"
                    dataKey={dataKey}
                    stroke={getLineColor(dataKey, index)}
                    strokeWidth={isAverage ? 2 : 2}
                    strokeDasharray={isAverage ? "5 5" : "0"}
                    dot={{ r: isAverage ? 3 : 4 }}
                    connectNulls={false}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Crescimento por Aluno
        </h2>

        {/* Seletor de Indicador */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Indicador:</label>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <button onClick={() => setSelectedIndicator('geral')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[44px] ${selectedIndicator === 'geral' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <LayoutGrid className="w-4 h-4 flex-shrink-0" /> 
              <span className="truncate">Geral</span>
            </button>
            <button onClick={() => setSelectedIndicator('lucro')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[44px] ${selectedIndicator === 'lucro' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <TrendingUp className="w-4 h-4 flex-shrink-0" /> 
              <span className="truncate">Lucro</span>
            </button>
            <button onClick={() => setSelectedIndicator('satisfacao')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[44px] ${selectedIndicator === 'satisfacao' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <Target className="w-4 h-4 flex-shrink-0" /> 
              <span className="truncate">Satisfação</span>
            </button>
            <button onClick={() => setSelectedIndicator('bonus')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[44px] ${selectedIndicator === 'bonus' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <Trophy className="w-4 h-4 flex-shrink-0" /> 
              <span className="truncate">Bônus</span>
            </button>
          </div>
        </div>

        {/* Seletor de Alunos com Filtros */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Alunos para o indicador "{getIndicatorLabel(selectedIndicator)}" ({selectedStudents.length} selecionados):
            </label>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Filter className="w-4 h-4" />
              {showAdvancedFilters ? 'Ocultar Filtros' : 'Filtros Avançados'}
            </button>
          </div>

          {/* Filtro por nome */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar aluno por nome..."
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {studentFilter && (
              <button
                onClick={() => setStudentFilter('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros avançados */}
          {showAdvancedFilters && (
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Mínimo de partidas:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minMatches}
                    onChange={(e) => setMinMatches(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ordenar por:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'matches' | 'performance')}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                  >
                    <option value="name">Nome</option>
                    <option value="matches">Número de partidas</option>
                    <option value="performance">Performance geral</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStudentFilter('')
                    setMinMatches(0)
                    setSortBy('name')
                  }}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          )}

          {/* Lista de alunos filtrados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 sm:max-h-40 overflow-y-auto p-1 border border-gray-200 rounded-lg">
            {getFilteredAndSortedStudents.map((student) => {
              const stats = getStudentStats(student.id)
              return (
                <label key={student.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => handleStudentToggle(student.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 truncate block max-w-full" title={student.name || ''}>{student.name}</span>
                    <span className="text-xs text-gray-500">
                      {stats.matchCount} partidas
                    </span>
                  </div>
                </label>
              )
            })}
            {getFilteredAndSortedStudents.length === 0 && (
              <p className="text-sm text-gray-500 col-span-full text-center py-4">
                {studentFilter ? 'Nenhum aluno encontrado com esse filtro.' : 'Nenhum aluno disponível.'}
              </p>
            )}
          </div>

          {/* Controles de seleção */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setSelectedStudents(getFilteredAndSortedStudents.map(s => s.id))}
              className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors min-h-[36px] flex items-center"
            >
              <span className="truncate">Selecionar Todos ({getFilteredAndSortedStudents.length})</span>
            </button>
            <button
              onClick={() => setSelectedStudents([])}
              className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors min-h-[36px] flex items-center"
            >
              <span className="truncate">Limpar Seleção</span>
            </button>
          </div>
          
          {/* Informações do filtro */}
          {(studentFilter || minMatches > 0 || sortBy !== 'name') && (
            <div className="mt-2 text-xs text-gray-500">
              Mostrando {getFilteredAndSortedStudents.length} de {selectedIndicator === 'geral' ? students.length : filteredStudents.length} alunos
              {studentFilter && ` • Filtro: "${studentFilter}"`}
              {minMatches > 0 && ` • Mín. ${minMatches} partidas`}
              {sortBy !== 'name' && ` • Ordenado por ${sortBy === 'matches' ? 'partidas' : 'performance'}`}
            </div>
          )}
        </div>
      </div>

      {/* Gráficos */}
      {selectedStudents.length > 0 && (
        <div className="space-y-6">
          {selectedIndicator !== 'geral' && growthData.length > 0 && (
            renderChart(growthData, classAverages, selectedIndicator)
          )}
          {selectedIndicator === 'geral' && unifiedData.length > 0 && (
            renderUnifiedChart(unifiedData)
          )}
        </div>
      )}
      {selectedStudents.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Selecione pelo menos um aluno para visualizar o gráfico de crescimento.</p>
        </div>
      )}
    </div>
  )
}