import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ScheduledDateInfo {
  date: Date
  initialTime: string
  endTime: string
  description: string
  index: number
  eventId?: string
  eventName?: string
  eventSubject?: string
}

interface ClassScheduleCalendarProps {
  scheduledDatesMap: Map<string, ScheduledDateInfo>
  currentMonth: Date
  setCurrentMonth: (month: Date) => void
}

export function ClassScheduleCalendar({ 
  scheduledDatesMap, 
  currentMonth, 
  setCurrentMonth
}: ClassScheduleCalendarProps) {
  const endOfCurrentMonth = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: currentMonth, end: endOfCurrentMonth })
  const startingDayIndex = getDay(currentMonth)

  const calendarDays: (Date | null)[] = [
    ...Array.from({ length: startingDayIndex }, () => null),
    ...daysInMonth
  ]

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const totalScheduledEvents = scheduledDatesMap.size


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-blue-600" />
        Cronograma da Turma
      </h2>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
        {/* Header do Calendário com Navegação */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate px-2" title={format(currentMonth, 'MMMM yyyy', { locale: ptBR })}>
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="overflow-x-auto pb-2">
          {/* Dias da Semana */}
          <div className="grid grid-cols-7 text-center text-xs sm:text-sm font-medium text-gray-600 mb-2 min-w-[280px]">
            {weekdays.map(day => (
              <div key={day} className="py-2 px-1">{day}</div>
            ))}
          </div>

          {/* Dias do Mês */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[280px]">
            {calendarDays.map((day, index) => {
              const isScheduled = day && scheduledDatesMap.has(format(day, 'yyyy-MM-dd'))
              const scheduledInfo = isScheduled ? scheduledDatesMap.get(format(day, 'yyyy-MM-dd')) : null

              return (
                <div
                  key={index}
                  className={`relative flex items-center justify-center w-full aspect-square rounded-md transition-all duration-200 text-xs sm:text-sm min-h-[36px] sm:min-h-[44px]
                    ${day ? 'bg-white text-gray-800' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}
                    ${isScheduled ? 'bg-blue-500 text-white font-semibold shadow-md hover:scale-105 cursor-pointer' : 'hover:bg-gray-100 cursor-default'}
                    ${!day ? 'cursor-not-allowed' : ''}
                  `}
                  title={isScheduled && scheduledInfo ? scheduledInfo.eventName || scheduledInfo.description : undefined}
                  onClick={isScheduled && scheduledInfo?.eventId ? () => window.open(`/events/${scheduledInfo.eventId}`, '_blank') : undefined}
                >
                  {day ? format(day, 'd') : ''}
                  {isScheduled && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full"></div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Resumo */}
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-800 font-medium text-center">
            📅 {totalScheduledEvents} encontro{totalScheduledEvents > 1 ? 's' : ''} programado{totalScheduledEvents > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}