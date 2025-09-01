// src/utils/eventUtils.ts
import { parseISO, isBefore, isAfter, isWithinInterval } from 'date-fns'

export interface EventSchedule {
  'initial-time': string
  'end-time': string
}

export interface ClassEvent {
  id: string
  name: string
  code: string
  subject: string | null
  event_type: 'training' | 'group'
  schedule: EventSchedule[] | null
  created_at: string
}

export interface ClassDynamicInfo {
  nextEvent: ClassEvent | null
  activeEvent: ClassEvent | null
  lastEvent: ClassEvent | null
  totalEvents: number
  status: 'active' | 'upcoming' | 'completed' | 'no_events'
  statusLabel: string
  eventType: string | null
  nextEventDate: Date | null
  activeEventProgress: {
    current: EventSchedule | null
    remaining: EventSchedule[]
  } | null
}

/**
 * Calcula informações dinâmicas da turma baseadas nos eventos
 */
export function calculateClassDynamicInfo(events: ClassEvent[]): ClassDynamicInfo {
  const now = new Date()
  const eventsWithDates = events.filter(event => 
    event.schedule && Array.isArray(event.schedule) && event.schedule.length > 0
  )

  // Flatten all schedules with event info
  const allSchedules = eventsWithDates.flatMap(event => 
    event.schedule!.map(schedule => ({
      event,
      schedule,
      startDate: parseISO(schedule['initial-time']),
      endDate: parseISO(schedule['end-time'])
    }))
  ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  // Find active event (happening now)
  const activeSchedule = allSchedules.find(({ startDate, endDate }) =>
    isWithinInterval(now, { start: startDate, end: endDate })
  )

  // Find next event (future)
  const nextSchedule = allSchedules.find(({ startDate }) =>
    isAfter(startDate, now)
  )

  // Find last completed event
  const completedSchedules = allSchedules.filter(({ endDate }) =>
    isBefore(endDate, now)
  )
  const lastSchedule = completedSchedules[completedSchedules.length - 1]

  // Determine status
  let status: ClassDynamicInfo['status']
  let statusLabel: string

  if (activeSchedule) {
    status = 'active'
    statusLabel = `Em andamento: ${activeSchedule.event.name}`
  } else if (nextSchedule) {
    status = 'upcoming'
    const daysUntil = Math.ceil((nextSchedule.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    statusLabel = daysUntil === 0 
      ? 'Próximo evento hoje'
      : daysUntil === 1 
      ? 'Próximo evento amanhã'
      : `Próximo evento em ${daysUntil} dias`
  } else if (lastSchedule) {
    status = 'completed'
    statusLabel = 'Todos os eventos concluídos'
  } else {
    status = 'no_events'
    statusLabel = 'Nenhum evento programado'
  }

  // Active event progress (if there's an active event)
  let activeEventProgress: ClassDynamicInfo['activeEventProgress'] = null
  if (activeSchedule) {
    const eventSchedules = activeSchedule.event.schedule!
    const currentIndex = eventSchedules.findIndex(s => 
      s['initial-time'] === activeSchedule.schedule['initial-time']
    )
    
    activeEventProgress = {
      current: eventSchedules[currentIndex],
      remaining: eventSchedules.slice(currentIndex + 1)
    }
  }

  return {
    nextEvent: nextSchedule?.event || null,
    activeEvent: activeSchedule?.event || null,
    lastEvent: lastSchedule?.event || null,
    totalEvents: events.length,
    status,
    statusLabel,
    eventType: activeSchedule?.event.event_type || nextSchedule?.event.event_type || null,
    nextEventDate: nextSchedule?.startDate || null,
    activeEventProgress
  }
}

/**
 * Obtém o label do tipo de evento
 */
export function getEventTypeLabel(eventType: string | null): string {
  switch (eventType) {
    case 'training':
      return 'Training (Individual)'
    case 'group':
      return 'Group (Em Equipe)'
    default:
      return 'Não definido'
  }
}

/**
 * Obtém cor do status
 */
export function getStatusColor(status: ClassDynamicInfo['status']): string {
  switch (status) {
    case 'active':
      return 'text-green-600'
    case 'upcoming':
      return 'text-blue-600'
    case 'completed':
      return 'text-gray-600'
    case 'no_events':
      return 'text-orange-600'
    default:
      return 'text-gray-600'
  }
}