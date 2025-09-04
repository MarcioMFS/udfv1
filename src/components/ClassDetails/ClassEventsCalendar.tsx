// src/components/ClassDetails/ClassEventsCalendar.tsx
import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Search, ExternalLink, Filter } from 'lucide-react'
import { CustomTooltip } from '../ui/CustomTooltip'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'training' | 'group'>('all')
  const [showAll, setShowAll] = useState(false)

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

  const getFilteredEvents = () => {
    let filtered = scheduledEvents

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(se => 
        se.event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (se.event.subject && se.event.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
        se.event.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by event type
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(se => se.event.event_type === eventTypeFilter)
    }

    return filtered
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
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">Cronograma</h3>
              <p className="text-xs text-gray-600">
                {scheduledEvents.length} evento{scheduledEvents.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={goToPreviousMonth}
            className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            ←
          </button>
          
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-800">
              {format(currentMonth, 'MMM yyyy', { locale: ptBR })}
            </h4>
            <button
              onClick={goToToday}
              className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-xs"
            >
              Hoje
            </button>
          </div>

          <button
            onClick={goToNextMonth}
            className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            →
          </button>
        </div>
      </div>

      <div className="p-4">
        {scheduledEvents.length === 0 ? (
          <div className="text-center py-4">
            <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhum evento este mês</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-3">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                <div key={`${day}-${index}`} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
              
              {days.map(day => {
                const dayEvents = getEventsForDate(day)
                const isToday = isSameDay(day, today)
                
                return dayEvents.length > 0 ? (
                  <CustomTooltip
                    key={day.toISOString()}
                    content={dayEvents.map(se => se.event.name).join(', ')}
                  >
                    <div
                      className={`min-h-[45px] p-1 border rounded text-center ${
                        isToday 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`text-xs font-medium mb-1 ${
                        isToday ? 'text-blue-600' : 'text-gray-700'
                      }`}>
                        {format(day, 'd')}
                      </div>
                      
                      {dayEvents.map((scheduledEvent, index) => (
                        <div
                          key={`${scheduledEvent.event.id}-${index}`}
                          className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                            scheduledEvent.event.event_type === 'training'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                        />
                      ))}
                    </div>
                  </CustomTooltip>
                ) : (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[45px] p-1 border rounded text-center ${
                      isToday 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 ${
                      isToday ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Event List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800">Eventos do mês</h4>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value as 'all' | 'training' | 'group')}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="all">Todos</option>
                    <option value="training">Training</option>
                    <option value="group">Group</option>
                  </select>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded pl-7 pr-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                {(() => {
                  const filteredEvents = getFilteredEvents()
                  const displayEvents = showAll ? filteredEvents : filteredEvents.slice(0, 5)
                  
                  return (
                    <>
                      {displayEvents.map((scheduledEvent, index) => (
                        <div
                          key={`${scheduledEvent.event.id}-${index}`}
                          className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                scheduledEvent.event.event_type === 'training' ? 'bg-yellow-500' : 'bg-green-500'
                              }`} />
                              
                              <div className="flex-1 min-w-0">
                                <div className="mb-1">
                                  <h5 className="text-sm font-medium text-gray-800 truncate">{scheduledEvent.event.name}</h5>
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Calendar className="w-3 h-3" />
                                    {format(scheduledEvent.date, 'dd/MM/yyyy', { locale: ptBR })}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Clock className="w-3 h-3" />
                                    {format(scheduledEvent.date, 'HH:mm')} - {format(parseISO(scheduledEvent.schedule['end-time']), 'HH:mm')}
                                  </div>
                                  {scheduledEvent.event.subject && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                      <MapPin className="w-3 h-3" />
                                      <span className="truncate">{scheduledEvent.event.subject}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-xs font-mono text-gray-500">{scheduledEvent.event.code}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    scheduledEvent.event.event_type === 'training' 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {scheduledEvent.event.event_type === 'training' ? 'Training' : 'Group'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <a
                              href={`/events/${scheduledEvent.event.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Ver evento"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}

                      {filteredEvents.length > 5 && (
                        <button
                          onClick={() => setShowAll(!showAll)}
                          className="w-full text-xs text-blue-600 hover:text-blue-800 py-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                        >
                          {showAll ? 'Ver menos' : `Ver todos (${filteredEvents.length})`}
                        </button>
                      )}

                      {filteredEvents.length === 0 && (
                        <div className="text-center py-4">
                          <Calendar className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">Nenhum evento encontrado</p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}