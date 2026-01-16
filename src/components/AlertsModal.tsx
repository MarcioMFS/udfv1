import { X, AlertTriangle, TrendingDown, Trophy, Users, UserX, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { calculateStudentAlerts } from '../utils/alertCalculations'

interface AlertsModalProps {
  isOpen: boolean
  onClose: () => void
  classId?: string // Opcional: se fornecido, mostra dados apenas desta turma
}

interface AlertData {
  criticalCount: number
  lowPerformanceCount: number
  inactiveCount: number
  criticalStudents: Array<{
    name: string
    purpose: string
    value: number
    statusColor: 'green' | 'yellow' | 'red'
  }>
  lowPerformanceStudents: Array<{
    name: string
    purpose: string
    value: number
    statusColor: 'green' | 'yellow' | 'red'
  }>
  inactiveStudents: Array<{
    name: string
  }>
  bestPerformer: string
  bestPerformerScore: number
  engagementRate: number
}

export function AlertsModal({ isOpen, onClose, classId }: AlertsModalProps) {
  const { user } = useAuth()
  const [alertData, setAlertData] = useState<AlertData>({
    criticalCount: 0,
    lowPerformanceCount: 0,
    inactiveCount: 0,
    criticalStudents: [],
    lowPerformanceStudents: [],
    inactiveStudents: [],
    bestPerformer: '',
    bestPerformerScore: 0,
    engagementRate: 0
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      loadAlertData()
    }
  }, [isOpen, user])

  const loadAlertData = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      let classes
      if (classId) {
        const { data } = await supabase
          .from('classes')
          .select('id')
          .eq('id', classId)
          .eq('instructor_id', user.id)
        classes = data
      } else {
        // Modal sendo usado no dashboard geral
        const { data } = await supabase
          .from('classes')
          .select('id')
          .eq('instructor_id', user.id)
        classes = data
      }

      if (!classes?.length) {
        setIsLoading(false)
        return
      }

      let allCriticalStudents: any[] = []
      let allLowPerformanceStudents: any[] = []
      let allInactiveStudents: any[] = []
      let bestPerformer = ''
      let bestPerformerScore = 0
      let totalEngagementSum = 0
      let classesWithData = 0

      const classIds = classes.map(c => c.id)
      
      const [playersResponse, matchResultsResponse, teamsResponse] = await Promise.all([
        supabase
          .from('class_players')
          .select(`
            *,
            players:player_id (id, name, email, purpose, color, team_id)
          `)
          .in('class_id', classIds),
        supabase
          .from('match_results')
          .select('*, events!inner(class_id)')
          .in('events.class_id', classIds),
        supabase
          .from('teams')
          .select('*')
          .in('class_id', classIds)
      ])

      const playersDataByClass = new Map()
      const matchResultsDataByClass = new Map()
      const teamsDataByClass = new Map()

      playersResponse.data?.forEach(player => {
        if (!playersDataByClass.has(player.class_id)) {
          playersDataByClass.set(player.class_id, [])
        }
        playersDataByClass.get(player.class_id).push(player)
      })

      matchResultsResponse.data?.forEach(result => {
        const classId = result.events?.class_id
        if (classId) {
          if (!matchResultsDataByClass.has(classId)) {
            matchResultsDataByClass.set(classId, [])
          }
          matchResultsDataByClass.get(classId).push(result)
        }
      })

      teamsResponse.data?.forEach(team => {
        if (!teamsDataByClass.has(team.class_id)) {
          teamsDataByClass.set(team.class_id, [])
        }
        teamsDataByClass.get(team.class_id).push(team)
      })

      for (const classItem of classes) {
        const currentClassId = classItem.id
        const playersData = playersDataByClass.get(currentClassId) || []
        const matchResultsData = matchResultsDataByClass.get(currentClassId) || []
        const teamsData = teamsDataByClass.get(currentClassId) || []
        
        if (!playersData.length) {
          continue
        }

        classesWithData++
        
        const students = playersData.map((p: any) => p.players).filter(Boolean)
        const matchResults = matchResultsData
        
        const teams = teamsData.map((team: any) => ({
          ...team,
          members: students.filter((student: any) => student.team_id === team.id)
        }))

        const alerts = calculateStudentAlerts(students, matchResults, teams)
        
        allCriticalStudents.push(...alerts.criticalStudents)
        allLowPerformanceStudents.push(...alerts.lowPerformanceStudents)
        allInactiveStudents.push(...alerts.inactiveStudents)

        alerts.criticalStudents.concat(alerts.lowPerformanceStudents).forEach(student => {
          if (student.value > bestPerformerScore) {
            bestPerformer = student.name
            bestPerformerScore = student.value
          }
        })
        
        const classPlayers = students.length
        const classParticipations = matchResults.length
        const uniqueMatchNumbers = [...new Set(matchResults.map((r: any) => r.match_number))]
        const classUniqueMatches = uniqueMatchNumbers.length
        
        if (classPlayers > 0 && classUniqueMatches > 0) {
          const classEngagement = Math.min(100, Math.round((classParticipations / (classPlayers * classUniqueMatches)) * 100))
          totalEngagementSum += classEngagement
        }
      }

      const avgEngagementRate = classesWithData > 0 ? Math.round(totalEngagementSum / classesWithData) : 0
      
      setAlertData({
        criticalCount: allCriticalStudents.length,
        lowPerformanceCount: allLowPerformanceStudents.length,
        inactiveCount: allInactiveStudents.length,
        criticalStudents: allCriticalStudents,
        lowPerformanceStudents: allLowPerformanceStudents,
        inactiveStudents: allInactiveStudents,
        bestPerformer,
        bestPerformerScore,
        engagementRate: avgEngagementRate
      })
    } catch (error) {
      console.error('Erro ao carregar dados de alertas:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const totalAlerts = alertData.criticalCount + alertData.lowPerformanceCount + alertData.inactiveCount
  
  const hasLowEngagement = alertData.engagementRate < 70
  const totalItems = totalAlerts + (hasLowEngagement ? 1 : 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Notificações
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {alertData.bestPerformer && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Star className="w-5 h-5 text-blue-500 mr-2" />
                    <h3 className="font-semibold text-blue-800">Melhor Desempenho</h3>
                  </div>
                  <p className="text-blue-700">
                    <span className="font-semibold">{alertData.bestPerformer}</span> tem o melhor score combinado ({alertData.bestPerformerScore})
                  </p>
                </div>
              )}

              {hasLowEngagement && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <TrendingDown className="w-5 h-5 text-orange-500 mr-2" />
                    <h3 className="font-semibold text-orange-800">Engajamento Baixo</h3>
                  </div>
                  <p className="text-orange-700">
                    Taxa de engajamento média: <span className="font-semibold">{alertData.engagementRate}%</span>
                  </p>
                  <p className="text-sm text-orange-600">Considere estratégias para aumentar a participação</p>
                </div>
              )}

              {alertData.criticalCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                    <h3 className="font-semibold text-red-800">Desempenho Crítico</h3>
                  </div>
                  <div className="text-2xl font-bold text-red-600 mb-1">
                    {alertData.criticalCount}
                  </div>
                  <p className="text-sm text-red-600 mb-3">
                    {alertData.criticalCount === 1 ? 'aluno precisa' : 'alunos precisam'} de atenção urgente
                  </p>
                  {alertData.criticalStudents.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {alertData.criticalStudents.slice(0, 4).map((student, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded-full bg-white text-red-700 border border-red-300 font-medium"
                        >
                          {student.name}
                        </span>
                      ))}
                      {alertData.criticalStudents.length > 4 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-white text-red-700 border border-red-300 font-medium">
                          +{alertData.criticalStudents.length - 4} mais
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {alertData.lowPerformanceCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <TrendingDown className="w-5 h-5 text-yellow-500 mr-2" />
                    <h3 className="font-semibold text-yellow-800">Desempenho Baixo</h3>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600 mb-1">
                    {alertData.lowPerformanceCount}
                  </div>
                  <p className="text-sm text-yellow-600 mb-3">
                    {alertData.lowPerformanceCount === 1 ? 'aluno está' : 'alunos estão'} abaixo da média
                  </p>
                  {alertData.lowPerformanceStudents.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {alertData.lowPerformanceStudents.slice(0, 4).map((student, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded-full bg-white text-yellow-700 border border-yellow-300 font-medium"
                        >
                          {student.name}
                        </span>
                      ))}
                      {alertData.lowPerformanceStudents.length > 4 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-white text-yellow-700 border border-yellow-300 font-medium">
                          +{alertData.lowPerformanceStudents.length - 4} mais
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Users className="w-5 h-5 text-blue-500 mr-2" />
                  <h3 className="font-semibold text-blue-800">Engajamento</h3>
                </div>
                <p className="text-blue-700 mb-2">
                  Engajamento da turma em {alertData.engagementRate}%
                  {alertData.engagementRate < 70 && ' - considere estratégias para aumentar a participação'}
                </p>
                <div className="text-2xl font-bold text-blue-600">
                  {alertData.engagementRate}%
                </div>
              </div>

              {alertData.inactiveCount > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <UserX className="w-5 h-5 text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-800">Alunos Inativos</h3>
                  </div>
                  <div className="text-2xl font-bold text-gray-600 mb-1">
                    {alertData.inactiveCount}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {alertData.inactiveCount === 1 ? 'aluno ainda não enviou' : 'alunos ainda não enviaram'} resultados
                  </p>
                  {alertData.inactiveStudents.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {alertData.inactiveStudents.slice(0, 4).map((student, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded-full bg-white text-gray-700 border border-gray-300 font-medium"
                        >
                          {student.name}
                        </span>
                      ))}
                      {alertData.inactiveStudents.length > 4 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-white text-gray-700 border border-gray-300 font-medium">
                          +{alertData.inactiveStudents.length - 4} mais
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {totalItems === 0 && !isLoading && (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-green-600 font-semibold">Tudo certo!</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Não há notificações no momento.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}