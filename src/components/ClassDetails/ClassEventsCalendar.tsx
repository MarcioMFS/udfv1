// src/components/ClassDetails/ClassEventsCalendar.tsx
import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface EventSchedule {
  'initial-time': string
  'end-time': string
}

interface ClassEvent {
  id: string
  name: string
  code: string
  subject: string
  event_type: 'training' | 'group'
  schedule: EventSchedule[]
  created_at: string
}

interface ScheduledEvent {
  event: ClassEvent
  schedule: EventSchedule
  date: Date
}

interface ClassEventsCalendarProps {
  classId: string
}

export function ClassEventsCalendar({ classId }: ClassEventsCalendarProps) {
  const [events, setEvents] = useState<ClassEvent[]>([])
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
  }, [classId])

  useEffect(() => {
    processScheduledEvents()
  }, [events, currentMonth])

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, code, subject, event_type, schedule, created_at')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
      setError('Erro ao carregar eventos')
    } finally {
      setIsLoading(false)
    }
  }

  const processScheduledEvents = () => {
    const scheduled: ScheduledEvent[] = []
    
    events.forEach(event => {
      if (event.schedule && Array.isArray(event.schedule)) {
        event.schedule.forEach(scheduleItem => {
          try {
            const date = parseISO(scheduleItem['initial-time'])
            if (isSameMonth(date, currentMonth)) {
              scheduled.push({
                event,
                schedule: scheduleItem,
                date
              })
            }
          } catch (error) {
            console.warn('Invalid date in schedule:', scheduleItem['initial-time'])
          }
        })
      }
    })

    // Sort by date
    scheduled.sort((a, b) => a.date.getTime() - b.date.getTime())
    setScheduledEvents(scheduled)
  }

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }

  const getEventsForDate = (date: Date) => {
    return scheduledEvents.filter(se => isSameDay(se.date, date))
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadEvents} />
  }

  const days = getDaysInMonth()
  const today = new Date()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Cronograma de Eventos</h3>
              <p className="text-sm text-gray-600">
                {scheduledEvents.length} evento{scheduledEvents.length !== 1 ? 's' : ''} programado{scheduledEvents.length !== 1 ? 's' : ''} este mês
              </p>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Anterior
          </button>
          
          <div className="flex items-center gap-4">
            <h4 className="text-xl font-semibold text-gray-800">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h4>
            <button
              onClick={goToToday}
              className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
            >
              Hoje
            </button>
          </div>

          <button
            onClick={goToNextMonth}
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Próximo →
          </button>
        </div>
      </div>

      <div className="p-6">
        {scheduledEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum evento programado para este mês</p>
            <p className="text-sm text-gray-400 mt-1">
              Eventos aparecerão aqui quando tiverem cronogramas definidos
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
              
              {days.map(day => {
                const dayEvents = getEventsForDate(day)
                const isToday = isSameDay(day, today)
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[80px] p-2 border rounded-lg ${
                      isToday 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    
                    {dayEvents.map((scheduledEvent, index) => (
                      <div
                        key={`${scheduledEvent.event.id}-${index}`}
                        className={`text-xs p-1 rounded mb-1 ${
                          scheduledEvent.event.event_type === 'training'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                        title={`${scheduledEvent.event.name} - ${format(scheduledEvent.date, 'HH:mm')} às ${format(parseISO(scheduledEvent.schedule['end-time']), 'HH:mm')}`}
                      >
                        <div className="truncate font-medium">
                          {scheduledEvent.event.name}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {format(scheduledEvent.date, 'HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* Event List */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Eventos deste mês:</h4>
              <div className="space-y-3">
                {scheduledEvents.map((scheduledEvent, index) => (
                  <div
                    key={`${scheduledEvent.event.id}-${index}`}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      scheduledEvent.event.event_type === 'training' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-gray-800">{scheduledEvent.event.name}</h5>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          scheduledEvent.event.event_type === 'training'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {scheduledEvent.event.event_type === 'training' ? 'Training' : 'Group'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(scheduledEvent.date, 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(scheduledEvent.date, 'HH:mm')} - {format(parseISO(scheduledEvent.schedule['end-time']), 'HH:mm')}
                        </div>
                        {scheduledEvent.event.subject && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {scheduledEvent.event.subject}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Código</p>
                      <p className="font-mono font-medium text-gray-800">{scheduledEvent.event.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}