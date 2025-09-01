import { ClassOverview } from './ClassOverview'
import { DetailedReport } from './DetailedReport'
import { ClassInfoCard } from './ClassInfoCard'
import { ClassRankingChart } from './ClassRankingChart'
import { ClassStudentsList } from './ClassStudentsList'
import { ClassIndicators } from './ClassIndicators'
import { ClassInstructors } from './ClassInstructors'
import { ClassEventsCalendar } from './ClassEventsCalendar'
import StudentGrowth from './ClassGrowthChart'
import { EmptyState } from '../ui'

import { 
  TabType, 
  Class, 
  Student, 
  Team, 
  MatchResult, 
  RankingData, 
  StudentIndicator, 
  ClassStats,
  EventType 
} from '../../types'
import { getEventTypeLabel, getClassStatus } from '../../utils'
import { Crown, Medal, Trophy } from 'lucide-react'

interface ClassDetailsContentProps {
  activeTab: TabType
  classData: Class
  students: Student[]
  teams: Team[]
  matchResults: MatchResult[]
  rankingData: RankingData[]
  studentIndicators: StudentIndicator[]
  classStats: ClassStats
  isLoading: boolean
  searchParams: URLSearchParams
}

export function ClassDetailsContent({
  activeTab,
  classData,
  students,
  teams,
  matchResults,
  rankingData,
  studentIndicators,
  classStats,
  isLoading,
  searchParams
}: ClassDetailsContentProps) {

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />
      case 2: return <Medal className="w-5 h-5 text-gray-400" />
      case 3: return <Medal className="w-5 h-5 text-orange-600" />
      default: return <Trophy className="w-4 h-4 text-blue-600" />
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <ClassOverview studentIndicators={studentIndicators} stats={classStats} />
            <ClassEventsCalendar classId={classData.id} />
            <ClassInfoCard
              classData={classData}
              getEventTypeLabel={(eventType: string) => getEventTypeLabel(eventType as EventType)}
              getStatusColor={(start: string | null, end: string | null) => getClassStatus(start, end).color}
              getStatusLabel={(start: string | null, end: string | null) => getClassStatus(start, end).label}
            />
            <ClassStudentsList students={students} matchResults={matchResults} />
          </>
        )

      case 'ranking':
        return rankingData.length > 0 ? (
          <ClassRankingChart
            rankingData={rankingData}
            getRankIcon={getRankIcon}
            classId={classData.id}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <EmptyState
              title="Nenhum ranking disponível"
              message="Não há dados de ranking disponíveis para esta turma ainda."
            />
          </div>
        )

      case 'indicators':
        return (
          <ClassIndicators
            studentIndicators={studentIndicators}
            isLoading={isLoading}
            initialSearchTerm={searchParams.get('search') || ''}
          />
        )

      case 'growth':
        return (
          <StudentGrowth 
            students={students}
            matchResults={matchResults}
            teams={teams}
          />
        )

      case 'detailed-report':
        return (
          <DetailedReport
            classData={classData}
            students={students}
            matchResults={matchResults}
            teams={teams}
          />
        )

      case 'instructors':
        return (
          <ClassInstructors classId={classData.id} />
        )

      default:
        return null
    }
  }

  return <>{renderTabContent()}</>
}