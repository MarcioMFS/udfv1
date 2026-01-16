import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  TrendingUp,
  Users,
  Trophy,
  Target,
  Calendar,
  Download,
  Filter,
  Zap
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MatchResultsChart } from '../components/Reports/MatchResultsChart'
import toast from 'react-hot-toast'

interface ReportData {
  totalEvents: number
  totalClasses: number
  totalPlayers: number
  totalMatches: number
  totalMatchResults: number
  avgLucro: number
  avgSatisfacao: number
  avgBonus: number
  avgEngagement: number
  totalStudentsImpacted: number
}

interface ChartData {
  name: string
  value: number
  score?: number
  time?: number
  accuracy?: number
  engagement?: number
}

export function ReportsPage() {
  const { user } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [performanceData, setPerformanceData] = useState<ChartData[]>([])
  const [subjectData, setSubjectData] = useState<ChartData[]>([])
  const [timelineData, setTimelineData] = useState<ChartData[]>([])
  const [engagementData, setEngagementData] = useState<{ name: string; engagement: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30')

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

  useEffect(() => {
    if (user) loadReportData()
  }, [user, selectedPeriod])

  const loadReportData = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()
      switch (selectedPeriod) {
        case '7': startDate.setDate(endDate.getDate() - 7); break
        case '30': startDate.setDate(endDate.getDate() - 30); break
        case '90': startDate.setDate(endDate.getDate() - 90); break
        case '365': startDate.setDate(endDate.getDate() - 365); break
        default: startDate.setDate(endDate.getDate() - 30)
      }

      const [
        { count: eventsCount },
        { count: classesCount },
        { data: classes }
      ] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('instructor_id', user!.id),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('instructor_id', user!.id),
        supabase.from('classes').select('id').eq('instructor_id', user!.id)
      ])

      let playersCount = 0, matchesCount = 0, matchResultsCount = 0
      let avgLucro = 0, avgSatisfacao = 0, avgBonus = 0
      let totalStudentsImpacted = 0, avgEngagement = 0

      if (classes && classes.length > 0) {
        const classIds = classes.map(c => c.id)
        const { data: uniquePlayersData } = await supabase
          .from('class_players').select('player_id').in('class_id', classIds)
        const uniquePlayerIds = [...new Set(uniquePlayersData?.map(cp => cp.player_id) || [])]
        totalStudentsImpacted = uniquePlayerIds.length

        const { count: players } = await supabase
          .from('class_players').select('*', { count: 'exact', head: true }).in('class_id', classIds)
        playersCount = players || 0

        const { count: matches } = await supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .in('class_id', classIds)
          .gte('match_date', startDate.toISOString())
          .lte('match_date', endDate.toISOString())
        matchesCount = matches || 0

        const { data: matchResults, count: matchResultsCountData } = await supabase
          .from('match_results')
          .select('lucro, satisfacao, bonus, bonus_money, class_id')
          .in('class_id', classIds)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
        matchResultsCount = matchResultsCountData || 0

        if (matchResults && matchResults.length > 0) {
          const totals = matchResults.reduce((acc, result) => {
            acc.lucro += result.lucro || 0
            acc.satisfacao += result.satisfacao || 0
            acc.bonus += result.bonus_money || 0
            return acc
          }, { lucro: 0, satisfacao: 0, bonus: 0 })
          avgLucro = totals.lucro / matchResults.length
          avgSatisfacao = totals.satisfacao / matchResults.length
          avgBonus = totals.bonus / matchResults.length
        }

        const classEngagements = await Promise.all(
          classIds.map(async classId => {
            const { data: classMatchResults } = await supabase
              .from('match_results').select('match_number, player_id, events!inner(class_id)')
              .eq('events.class_id', classId)
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString())

            const { count: classStudents } = await supabase
              .from('class_players').select('*', { count: 'exact', head: true })
              .eq('class_id', classId)

            if (!classMatchResults || classStudents === 0) return 0
            const uniqueMatches = [...new Set(classMatchResults.map(r => r.match_number))]
            const totalResults = classMatchResults.length
            return Math.min(100, Math.round((totalResults / ((classStudents as number) * uniqueMatches.length)) * 100))
          })
        )

        avgEngagement = classEngagements.length > 0
          ? Math.round(classEngagements.reduce((sum, e) => sum + e, 0) / classEngagements.length)
          : 0
      }

      setReportData({
        totalEvents: eventsCount || 0,
        totalClasses: classesCount || 0,
        totalPlayers: playersCount,
        totalMatches: matchesCount,
        totalMatchResults: matchResultsCount,
        avgLucro: Math.round(avgLucro),
        avgSatisfacao: Math.round(avgSatisfacao),
        avgBonus: Math.round(avgBonus),
        avgEngagement,
        totalStudentsImpacted
      })

      await loadPerformanceByClass(classes || [])
      await loadSubjectDistribution()
      await loadTimelineData(startDate, endDate)
      await loadEngagementData(classes || [], startDate, endDate)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados do relatório')
    } finally {
      setIsLoading(false)
    }
  }

  const loadPerformanceByClass = async (classes: any[]) => {
    if (classes.length === 0) return

    try {
      const classIds = classes.map(c => c.id)

      // Get classes data
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, code')
        .in('id', classIds)

      // Get events for these classes
      const { data: eventsData } = await supabase
        .from('events')
        .select('class_id, subject')
        .in('class_id', classIds)

      // Combine class and event data
      const classesWithEvents = (classesData || []).map(cls => ({
        ...cls,
        events: eventsData?.find(evt => evt.class_id === cls.id)
      }))

      if (!classesWithEvents) return

      const classPerformance = await Promise.all(
        classesWithEvents.map(async (classItem) => {
          const { data: results } = await supabase
            .from('match_results')
            .select('lucro, satisfacao, bonus, bonus_money, events!inner(class_id)')
            .eq('events.class_id', classItem.id)

          const { count: matchesCount } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classItem.id)

          const avgScore = results && results.length > 0
            ? results.reduce((sum, r) => sum + (r.lucro || 0) + (r.satisfacao || 0) + (r.bonus_money || 0), 0) / results.length
            : 0

          return {
            name: classItem.code,
            value: matchesCount || 0,
            score: Math.round(avgScore),
            time: Math.floor(Math.random() * 10) + 20,
            accuracy: Math.floor(Math.random() * 20) + 70
          }
        })
      )

      setPerformanceData(classPerformance)
    } catch (error) {
      console.error('Error loading performance by class:', error)
    }
  }

  const loadSubjectDistribution = async () => {
    try {
        if (!user) return;
      const { data: eventsData } = await supabase
        .from('events')
        .select('subject')
        .eq('instructor_id', user.id)

      if (!eventsData) return

      const subjectCounts = eventsData.reduce((acc, event) => {
        const subject = event.subject || 'Sem matéria'
        acc[subject] = (acc[subject] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const subjectData = Object.entries(subjectCounts).map(([subject, count]) => ({
        name: subject,
        value: count
      }))

      setSubjectData(subjectData)
    } catch (error) {
      console.error('Error loading subject distribution:', error)
    }
  }

  const loadTimelineData = async (startDate: Date, endDate: Date) => {
    try {
        if (!user) return;
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('instructor_id', user.id)

      if (!classes || classes.length === 0) return

      const classIds = classes.map(c => c.id)

      const periods = []
      const periodLength = selectedPeriod === '7' ? 1 : selectedPeriod === '30' ? 5 : selectedPeriod === '90' ? 15 : 60
      const currentDate = new Date(startDate)

      while (currentDate <= endDate) {
        const periodEnd = new Date(currentDate)
        periodEnd.setDate(periodEnd.getDate() + periodLength)
        
        periods.push({
          start: new Date(currentDate),
          end: periodEnd > endDate ? endDate : periodEnd,
          name: `${currentDate.getDate()}/${currentDate.getMonth() + 1}`
        })

        currentDate.setDate(currentDate.getDate() + periodLength)
      }

      const timelineData = await Promise.all(
        periods.map(async (period) => {
          const { count } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .in('class_id', classIds)
            .gte('match_date', period.start.toISOString())
            .lte('match_date', period.end.toISOString())

          return {
            name: period.name,
            value: count || 0
          }
        })
      )

      setTimelineData(timelineData)
    } catch (error) {
      console.error('Error loading timeline data:', error)
    }
  }

  const loadEngagementData = async (classes: any[], startDate: Date, endDate: Date) => {
    if (classes.length === 0) return

    try {
      const classIds = classes.map(c => c.id)

      const engagementByClass = await Promise.all(
        classIds.map(async (classId) => {
          const { data: classInfo } = await supabase
            .from('classes')
            .select('code')
            .eq('id', classId)
            .single()

          const { data: matchResults } = await supabase
            .from('match_results')
            .select('match_number, player_id, events!inner(class_id)')
            .eq('events.class_id', classId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())

          const { count: studentCount } = await supabase
            .from('class_players')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classId)

          if (!matchResults || !studentCount) {
            return {
              name: classInfo?.code || 'Turma',
              engagement: 0
            }
          }

          const uniqueMatches = [...new Set(matchResults.map(r => r.match_number))]
          const totalResults = matchResults.length
          const engagement = uniqueMatches.length > 0
            ? Math.min(100, Math.round((totalResults / (studentCount * uniqueMatches.length)) * 100))
            : 0

          return {
            name: classInfo?.code || 'Turma',
            engagement
          }
        })
      )

      setEngagementData(engagementByClass)
    } catch (error) {
      console.error('Error loading engagement data:', error)
    }
  }

  const exportReport = () => {
    if (!reportData) {
      toast.error('Nenhum dado disponível para exportar')
      return
    }

    const csvData = [
      ['Métrica', 'Valor'],
      ['Total de Eventos', reportData.totalEvents],
      ['Total de Turmas', reportData.totalClasses],
      ['Total de Alunos Impactados', reportData.totalStudentsImpacted],
      ['Total de Inscrições em Turmas', reportData.totalPlayers],
      ['Total de Partidas', reportData.totalMatches],
      ['Resultados de Partidas', reportData.totalMatchResults],
      ['Lucro Médio', reportData.avgLucro],
      ['Satisfação Média', reportData.avgSatisfacao],
      ['Bônus Médio', reportData.avgBonus],
      ['Engajamento Médio (%)', reportData.avgEngagement]
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `relatorio_instrutor_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
    
    toast.success('Relatório exportado com sucesso!')
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando relatórios...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-gray-600 mt-1">
            Análise consolidada de performance e indicadores de todas as suas turmas
          </p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 3 meses</option>
              <option value="365">Último ano</option>
            </select>
          </div>
          
          <button
            onClick={exportReport}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Download className="w-5 h-5" />
            Exportar
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-1">{reportData?.totalEvents || 0}</h3>
          <p className="text-gray-600 text-sm">Eventos Criados</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-1">{reportData?.totalStudentsImpacted || 0}</h3>
          <p className="text-gray-600 text-sm">Alunos Impactados</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Trophy className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-1">{reportData?.totalMatches || 0}</h3>
          <p className="text-gray-600 text-sm">Partidas Jogadas</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Zap className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-1">{reportData?.avgEngagement || 0}%</h3>
          <p className="text-gray-600 text-sm">Engajamento Médio</p>
        </div>
      </div>

      {/* Cards de Métricas de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-1">{reportData?.avgLucro || 0}</h3>
          <p className="text-gray-600 text-sm">Lucro Médio</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-1">{reportData?.avgSatisfacao || 0}</h3>
          <p className="text-gray-600 text-sm">Satisfação Média</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Trophy className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-1">{reportData?.avgBonus || 0}</h3>
          <p className="text-gray-600 text-sm">Bônus Médio</p>
        </div>
      </div>

      <MatchResultsChart selectedPeriod={selectedPeriod} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 mt-8">
        {/* Performance por Turma */}
        {performanceData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Performance por Turma</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'score') return [`${value} pts`, 'Pontuação Média']
                    return [value, name]
                  }}
                />
                <Bar dataKey="score" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Engajamento por Turma */}
        {engagementData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Engajamento por Turma</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Engajamento']}
                />
                <Bar dataKey="engagement" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Distribuição por Matéria */}
        {subjectData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Distribuição de Eventos</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subjectData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subjectData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Evolução Temporal */}
        {timelineData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Evolução de Partidas</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} partidas`, 'Total']} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabela de Performance Detalhada */}
      {performanceData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Performance Detalhada por Turma</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Turma</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Partidas</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Pontuação Média</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Engajamento</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.map((item, index) => {
                  const engagement = engagementData.find(e => e.name === item.name)?.engagement || 0
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{item.name}</td>
                      <td className="py-3 px-4 text-gray-600">{item.value}</td>
                      <td className="py-3 px-4 text-gray-600">{item.score} pts</td>
                      <td className="py-3 px-4 text-gray-600">{engagement}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}