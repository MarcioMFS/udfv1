
import { ClassScheduleCalendar } from './ClassScheduleCalendar'
import { ClassCodeCard } from './ClassCodeCard'
import { ClassSidebar } from './ClassSidebar'
import { ClassEventsCalendar } from './ClassEventsCalendar'
import toast from 'react-hot-toast'

import { Class, Student, Team, ScheduledDateInfo } from '../../types'
import { exportStudentsToCSV, hasValidSchedule } from '../../utils'

interface ClassDetailsSidebarProps {
  classData: Class
  students: Student[]
  teams: Team[]
  scheduledDatesMap: Map<string, ScheduledDateInfo>
  currentMonth: Date
  onMonthChange: (month: Date) => void
  onViewDetailedReport: () => void
}

export function ClassDetailsSidebar({
  classData,
  students,
  teams,
  scheduledDatesMap,
  currentMonth,
  onMonthChange,
  onViewDetailedReport
}: ClassDetailsSidebarProps) {

  const handleExportStudents = () => {
    try {
      exportStudentsToCSV(students, teams, classData.code)
      toast.success('Lista de alunos exportada com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar CSV:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao exportar lista de alunos')
    }
  }

  return (
    <>
      {hasValidSchedule(classData) && (
        <ClassScheduleCalendar
          scheduledDatesMap={scheduledDatesMap}
          currentMonth={currentMonth}
          setCurrentMonth={onMonthChange}
        />
      )}

      <ClassEventsCalendar classId={classData.id} />

      <ClassCodeCard classData={classData} />

      <ClassSidebar
        exportStudentsToCsv={handleExportStudents}
        onViewDetailedReport={onViewDetailedReport}
      />
    </>
  )
}