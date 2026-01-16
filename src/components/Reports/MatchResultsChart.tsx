import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface MatchResult {
  player_id: string
  class_id: string
  match_number: number
  lucro: number | null
  satisfacao: number | null
  bonus: number | null
  bonus_money: number | null
  created_at: string
  player?: {
    name: string | null
    email: string | null
  }
  class?: {
    code: string
    description: string | null
  }
}

interface ChartData {
  name: string
  lucro: number
  satisfacao: number
  bonus: number
  total: number
}

interface MatchResultsChartProps {
  selectedPeriod: string
}

export function MatchResultsChart({ selectedPeriod }: MatchResultsChartProps) {
  const { user } = useAuth()
  const [matchResults, setMatchResults] = useState<MatchResult[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B']

  useEffect(() => {
    if (user) {
      loadMatchResults()
    }
  }, [user, selectedPeriod])

  useEffect(() => {
    if (matchResults.length > 0) {
      processChartData()
    }
  }, [matchResults])

  const loadMatchResults = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      const endDate = new Date()
      const startDate = new Date()
      
      switch (selectedPeriod) {
        case '7':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90':
          startDate.setDate(endDate.getDate() - 90)
          break
        case '365':
          startDate.setDate(endDate.getDate() - 365)
          break
        default:
          startDate.setDate(endDate.getDate() - 30)
      }

      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id')
        .eq('instructor_id', user.id)

      if (classesError) {
        console.error('Error loading classes:', classesError)
        return
      }

      if (!classes || classes.length === 0) {
        setMatchResults([])
        setIsLoading(false)
        return
      }

      const classIds = classes.map(c => c.id)

      const { data: results, error: resultsError } = await supabase
        .from('match_results')
        .select(`
          *,
          players:player_id (name, email),
          events!inner(class_id, classes(code, description))
        `)
        .in('events.class_id', classIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      if (resultsError) {
        console.error('Error loading match results:', resultsError)
        return
      }

      const formattedResults = (results || []).map(result => ({
        ...result,
        player: Array.isArray(result.players) ? result.players[0] : result.players,
        class: result.events?.classes || null
      }))

      setMatchResults(formattedResults)
    } catch (error) {
      console.error('Error loading match results:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const processChartData = () => {
    const classGroups = matchResults.reduce((acc, result) => {
      const classCode = result.class?.code || 'Sem código'
      
      if (!acc[classCode]) {
        acc[classCode] = {
          name: classCode,
          lucro: [],
          satisfacao: [],
          bonus: [],
          count: 0
        }
      }

      if (result.lucro !== null) acc[classCode].lucro.push(result.lucro)
      if (result.satisfacao !== null) acc[classCode].satisfacao.push(result.satisfacao)
      if (result.bonus_money !== null) acc[classCode].bonus.push(result.bonus_money)
      acc[classCode].count++

      return acc
    }, {} as Record<string, any>)

    const processedData = Object.values(classGroups).map((group: any) => {
      const avgLucro = group.lucro.length > 0 
        ? group.lucro.reduce((sum: number, val: number) => sum + val, 0) / group.lucro.length 
        : 0
      const avgSatisfacao = group.satisfacao.length > 0 
        ? group.satisfacao.reduce((sum: number, val: number) => sum + val, 0) / group.satisfacao.length 
        : 0
      const avgBonus = group.bonus.length > 0 
        ? group.bonus.reduce((sum: number, val: number) => sum + val, 0) / group.bonus.length 
        : 0

      return {
        name: group.name,
        lucro: Math.round(avgLucro),
        satisfacao: Math.round(avgSatisfacao),
        bonus: Math.round(avgBonus),
        total: Math.round(avgLucro + avgSatisfacao + avgBonus)
      }
    })

    setChartData(processedData)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando resultados...</p>
          </div>
        </div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Resultados por Turma</h2>
        <div className="text-center py-12">
          <p className="text-gray-600">Nenhum resultado encontrado para o período selecionado.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Performance por Turma */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Performance por Turma</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="lucro" fill="#3B82F6" name="Lucro" />
            <Bar dataKey="satisfacao" fill="#10B981" name="Satisfação" />
            <Bar dataKey="bonus" fill="#F59E0B" name="Bônus" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Distribuição de Pontuação Total */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Pontuação Total por Turma</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, total }) => `${name}: ${total}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="total"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela Detalhada */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Detalhes por Turma</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Turma</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Lucro Médio</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Satisfação Média</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Bônus Médio</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Total Médio</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{item.name}</td>
                  <td className="py-3 px-4 text-gray-600">{item.lucro}</td>
                  <td className="py-3 px-4 text-gray-600">{item.satisfacao}</td>
                  <td className="py-3 px-4 text-gray-600">{item.bonus}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}