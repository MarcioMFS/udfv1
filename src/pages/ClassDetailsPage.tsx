import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { startOfMonth, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useClassData, useCalculations } from '../hooks'
import { TabType, ScheduledDateInfo } from '../types'
import { calculateStudentAlerts, getTotalAlertsCount } from '../utils'

import { ErrorBoundary } from '../components/ErrorBoundary'
import { PageLoading, ErrorMessage } from '../components/ui'
import { ClassDetailsHeader } from '../components/ClassDetails/ClassDetailsHeader'
import { ClassDetailsNavigation } from '../components/ClassDetails/ClassDetailsNavigation'
import { ClassDetailsContent } from '../components/ClassDetails/ClassDetailsContent'
import { ClassDetailsSidebar } from '../components/ClassDetails/ClassDetailsSidebar'
import { TeamFormationModal } from '../components/ClassDetails/TeamFormationModal'
import { FloatingTooltip } from '../components/common/FloatingTooltip'

export function ClassDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  
  const { classData, students, teams, matchResults, isLoading, error, refetch } = useClassData(id)
  const { rankingData, studentIndicators, classStats } = useCalculations({ students, matchResults, teams })
  
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [showTeamFormation, setShowTeamFormation] = useState(false)
  const [alertsCount, setAlertsCount] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [scheduledDatesMap, setScheduledDatesMap] = useState<Map<string, ScheduledDateInfo>>(new Map())
  
  const [tooltipInfo, setTooltipInfo] = useState<ScheduledDateInfo | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['overview', 'ranking', 'indicators', 'growth', 'detailed-report', 'instructors'].includes(tab)) {
      setActiveTab(tab as TabType)
    }
  }, [searchParams])

  useEffect(() => {
    if (students.length > 0 && studentIndicators.length > 0) {
      const alerts = calculateStudentAlerts(students, matchResults, teams)
      const totalAlerts = getTotalAlertsCount(alerts)
      setAlertsCount(totalAlerts)
    }
  }, [students, matchResults, teams, studentIndicators])

  useEffect(() => {
    if (!classData?.schedule || !Array.isArray(classData.schedule)) return

    const scheduleMap = new Map<string, ScheduledDateInfo>()
    
    const validMeetings = classData.schedule.filter(meeting => 
      meeting &&
      meeting['initial-time'] &&
      typeof meeting['initial-time'] === 'string' &&
      meeting['initial-time'].trim() !== '' &&
      meeting['end-time'] &&
      typeof meeting['end-time'] === 'string' &&
      meeting['end-time'].trim() !== ''
    )

    const sortedMeetings = validMeetings.sort((a, b) => {
      const dateA = parseISO(a['initial-time'])
      const dateB = parseISO(b['initial-time'])
      return dateA.getTime() - dateB.getTime()
    })

    sortedMeetings.forEach((meeting, index) => {
      try {
        const initialTime = parseISO(meeting['initial-time'])
        const endTime = parseISO(meeting['end-time'])

        let description = ''
        if (index === 0) {
          description = 'Primeiro encontro'
        } else if (index === sortedMeetings.length - 1) {
          description = 'Último encontro'
        } else {
          description = `${index + 1}º encontro`
        }
        
        scheduleMap.set(format(initialTime, 'yyyy-MM-dd'), {
          date: initialTime,
          initialTime: format(initialTime, 'HH:mm', { locale: ptBR }),
          endTime: format(endTime, 'HH:mm', { locale: ptBR }),
          description,
          index: index + 1
        })
      } catch (parseError) {
        console.warn('Error parsing schedule date for meeting:', meeting, parseError)
      }
    })

    if (sortedMeetings.length > 0) {
      try {
        const firstMeetingDate = parseISO(sortedMeetings[0]['initial-time'])
        setCurrentMonth(startOfMonth(firstMeetingDate))
      } catch (parseError) {
        console.warn('Error parsing first meeting date:', parseError)
      }
    }

    setScheduledDatesMap(scheduleMap)
  }, [classData])

  const handleShowTooltip = (info: ScheduledDateInfo | null, rect: DOMRect | null) => {
    if (info && rect) {
      setTooltipInfo(info)
      setTooltipPosition({
        top: rect.top,
        left: rect.left + rect.width / 2
      })
    } else {
      setTooltipInfo(null)
      setTooltipPosition(null)
    }
  }

  if (isLoading) {
    return <PageLoading message="Carregando detalhes da turma..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        title="Erro ao carregar turma"
        message={error}
        onRetry={refetch}
      />
    )
  }

  if (!classData) {
    return (
      <ErrorMessage 
        title="Turma não encontrada"
        message="Você não tem permissão para acessar esta turma ou ela não existe."
      />
    )
  }

  return (
    <ErrorBoundary>
      <div className="p-4 sm:p-6 lg:p-8">
        <ClassDetailsHeader 
          classData={classData}
          alertsCount={alertsCount}
          classId={id}
          onManageTeams={() => setShowTeamFormation(true)}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <ClassDetailsNavigation 
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <ClassDetailsContent
              activeTab={activeTab}
              classData={classData}
              students={students}
              teams={teams}
              matchResults={matchResults}
              rankingData={rankingData}
              studentIndicators={studentIndicators}
              classStats={classStats}
              isLoading={false}
              searchParams={searchParams}
            />
          </div>

          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <ClassDetailsSidebar
              classData={classData}
              students={students}
              teams={teams}
              scheduledDatesMap={scheduledDatesMap}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onShowTooltip={handleShowTooltip}
              onViewDetailedReport={() => setActiveTab('detailed-report')}
            />
          </div>
        </div>

        {classData && (
          <TeamFormationModal
            isOpen={showTeamFormation}
            onClose={() => setShowTeamFormation(false)}
            classId={id!}
            onTeamsUpdated={refetch}
          />
        )}

        <FloatingTooltip
          isVisible={!!tooltipInfo}
          position={tooltipPosition}
          content={
            tooltipInfo && (
              <div>
                <div className="font-semibold">{tooltipInfo.description}</div>
                <div className="mt-1">{tooltipInfo.initialTime} - {tooltipInfo.endTime}</div>
                <div className="text-gray-300 text-xs mt-1">
                  {format(tooltipInfo.date, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
                </div>
              </div>
            )
          }
        />
      </div>
    </ErrorBoundary>
  )
}