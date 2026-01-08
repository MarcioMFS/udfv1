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
  

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['overview', 'ranking', 'indicators', 'growth', 'detailed-report'].includes(tab)) {
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
    if (!classData?.events || !Array.isArray(classData.events)) return

    const scheduleMap = new Map<string, ScheduledDateInfo>()
    
    // Process events and their schedules
    classData.events.forEach(event => {
      if (event.schedule && Array.isArray(event.schedule)) {
        const validMeetings = event.schedule.filter(meeting => 
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
            const dateKey = format(initialTime, 'yyyy-MM-dd')

            let description = event.name || 'Evento'
            if (sortedMeetings.length > 1) {
              if (index === 0) {
                description += ' - Primeiro encontro'
              } else if (index === sortedMeetings.length - 1) {
                description += ' - Último encontro'
              } else {
                description += ` - ${index + 1}º encontro`
              }
            }
            
            const scheduleInfo = {
              date: initialTime,
              initialTime: format(initialTime, 'HH:mm', { locale: ptBR }),
              endTime: format(endTime, 'HH:mm', { locale: ptBR }),
              description,
              index: index + 1,
              eventId: event.id,
              eventName: event.name,
              eventSubject: event.subject
            }
            
            scheduleMap.set(dateKey, scheduleInfo)
          } catch (parseError) {
            console.warn('Error parsing schedule date for event:', event.name, meeting, parseError)
          }
        })
      }
    })

    // Set current month to the first event date if available
    if (scheduleMap.size > 0) {
      try {
        const dates = Array.from(scheduleMap.values()).map(info => info.date)
        const earliestDate = dates.sort((a, b) => a.getTime() - b.getTime())[0]
        setCurrentMonth(startOfMonth(earliestDate))
      } catch (parseError) {
        console.warn('Error parsing first meeting date:', parseError)
      }
    }

    setScheduledDatesMap(scheduleMap)
  }, [classData])


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

          <div className="space-y-6 xl:sticky xl:top-0 xl:self-start xl:mt-[72px]">
            <ClassDetailsSidebar
              classData={classData}
              students={students}
              teams={teams}
              scheduledDatesMap={scheduledDatesMap}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
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

      </div>
    </ErrorBoundary>
  )
}